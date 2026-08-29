import { courseRepository } from './course.repository';
import { userRepository } from '../user/user.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import {
  CreateCourseInput,
  UpdateCourseInput,
  AssignTeachersInput,
  EnrollStudentsInput,
  CourseListQuery,
  CreateLessonInput,
  UpdateLessonInput,
  BulkLessonsInput,
} from './course.validator';
import { CourseStatus } from '@prisma/client';
import { resolveS3Url, stripPresignedParams, deleteFromS3 } from '../../utils/s3';
import prisma from '../../config/database';

export const courseService = {
  // ── Categories ─────────────────────────────────────────────────────────────
  listCategories: () => courseRepository.findAllCategories(),

  createCategory: async (input: { name: string; slug?: string }) => {
    const slug = input.slug || input.name.toLowerCase().replace(/\s+/g, '-');
    return courseRepository.createCategory({ name: input.name, slug });
  },

  // ── Courses ────────────────────────────────────────────────────────────────
  listCourses: async (query: CourseListQuery, requesterId: string, requesterRole: string) => {
    const { page, limit, skip } = parsePaginationParams(query);

    const filters: any = {
      status: query.status as CourseStatus | undefined,
      categoryId: query.categoryId,
      search: query.search,
      skip,
      take: limit,
    };

    // Teachers see only their assigned courses
    if (requesterRole === 'TEACHER') {
      filters.teacherId = requesterId;
    }

    // Students see only their enrolled courses unless they are browsing
    if (requesterRole === 'STUDENT' && (query as any).browse !== 'true') {
      filters.studentId = requesterId;
    }

    const [courses, total] = await courseRepository.findAll(filters);

    // Resolve S3 image URLs
    await Promise.all(
      courses.map(async (course: any) => {
        course.image = await resolveS3Url(course.image);
      })
    );

    if (requesterRole === 'STUDENT') {
      const courseIds = courses.map((course) => course.id);
      // Batch lookup: single query instead of N+1
      const enrollments = courseIds.length > 0
        ? await prisma.enrollment.findMany({
            where: { studentId: requesterId, courseId: { in: courseIds } },
            select: { courseId: true, progress: true, durationDays: true },
          })
        : [];

      const enrollmentMap = new Map(enrollments.map(e => [e.courseId, e]));
      courses.forEach((course) => {
        const enrollment = enrollmentMap.get(course.id);
        if (enrollment) {
          (course as any).studentProgress = enrollment.progress;
          (course as any).studentDurationDays = enrollment.durationDays;
        }
      });
    }

    return {
      courses,
      meta: buildPaginationMeta({ page, limit, total }),
    };
  },

  getCourse: async (id: string, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(id);
    if (!course) throw AppError.notFound('Course not found');
    course.image = await resolveS3Url(course.image);

    // Students can only see courses they're enrolled in and content matching their duration + ALL
    if (requesterRole === 'STUDENT') {
      const enrollment = await courseRepository.isStudentEnrolled(id, requesterId);
      if (!enrollment) throw AppError.forbidden('You are not enrolled in this course');
      (course as any).studentProgress = enrollment.progress;
      (course as any).studentDurationDays = enrollment.durationDays;
      if (course.lessons) {
        course.lessons = course.lessons.filter((l: any) => l.durationDays === enrollment.durationDays || l.durationDays === 'ALL');
      }
    }

    // Teachers can only see their assigned courses
    if (requesterRole === 'TEACHER') {
      const assignment = await courseRepository.isTeacherAssigned(id, requesterId);
      if (!assignment) throw AppError.forbidden('You are not assigned to this course');
    }

    // Resolve lesson videoUrls if present
    const anyCourse = course as any;
    if (anyCourse.lessons && anyCourse.lessons.length > 0) {
      anyCourse.lessons = await Promise.all(
        anyCourse.lessons.map(async (lesson: any) => ({
          ...lesson,
          videoUrl: await resolveS3Url(lesson.videoUrl),
        }))
      );
    }

    return anyCourse;
  },

  // Admin creates a course and optionally assigns teachers + students right away
  createCourse: async (input: CreateCourseInput, adminId: string) => {
    // Validate category
    const category = await courseRepository.findCategoryById(input.categoryId);
    if (!category) throw AppError.notFound('Category not found');

    // Validate all teacherIds are TEACHER role (batch query instead of N+1)
    if (input.teacherIds && input.teacherIds.length > 0) {
      const teachers = await prisma.user.findMany({
        where: { id: { in: input.teacherIds }, role: 'TEACHER' },
        select: { id: true },
      });
      if (teachers.length !== input.teacherIds.length) {
        const validIds = new Set(teachers.map(t => t.id));
        const invalidId = input.teacherIds.find(id => !validIds.has(id));
        throw AppError.badRequest(`User ${invalidId} is not a teacher`);
      }
    }

    // Validate all studentIds are STUDENT role (batch query instead of N+1)
    if (input.studentIds && input.studentIds.length > 0) {
      const students = await prisma.user.findMany({
        where: { id: { in: input.studentIds }, role: 'STUDENT' },
        select: { id: true },
      });
      if (students.length !== input.studentIds.length) {
        const validIds = new Set(students.map(s => s.id));
        const invalidId = input.studentIds.find(id => !validIds.has(id));
        throw AppError.badRequest(`User ${invalidId} is not a student`);
      }
    }

    // Create the course
    const course = await courseRepository.create({
      title: input.title,
      description: input.description,
      categoryId: input.categoryId,
      subcategory: input.subcategory,
      duration: input.duration,
      status: (input.status || 'ACTIVE') as CourseStatus,
      image: input.image ? stripPresignedParams(input.image) || undefined : undefined,
      price: input.price || 0,
      externalUrl: input.externalUrl,
      createdById: adminId,
    });

    // Assign teachers
    if (input.teacherIds && input.teacherIds.length > 0) {
      await courseRepository.assignTeachers(course.id, input.teacherIds);
    }

    // Enroll students
    if (input.studentIds && input.studentIds.length > 0) {
      await courseRepository.enrollStudents(course.id, input.studentIds);
    }

    // Return updated course with relations
    return courseRepository.findById(course.id);
  },

  updateCourse: async (id: string, input: UpdateCourseInput, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(id);
    if (!course) throw AppError.notFound('Course not found');

    // Teacher can only update their assigned courses
    if (requesterRole === 'TEACHER') {
      const assignment = await courseRepository.isTeacherAssigned(id, requesterId);
      if (!assignment) throw AppError.forbidden('You are not assigned to this course');
    }

    const { teacherIds, studentIds, ...updateData } = input as any;

    if (updateData.image) {
      updateData.image = stripPresignedParams(updateData.image);
    }

    const oldImage = course.image;
    const newImage = updateData.image;

    const updated = await courseRepository.update(id, updateData);

    // Delete old image from S3 if updated successfully and was an S3 asset
    if (newImage !== oldImage && oldImage && oldImage.includes('amazonaws.com')) {
      try {
        const url = new URL(oldImage);
        const key = decodeURIComponent(url.pathname.substring(1));
        await deleteFromS3(key);
      } catch (err) {
        console.error('Failed to delete old course image from S3:', err);
      }
    }

    if (requesterRole === 'ADMIN') {
      if (teacherIds !== undefined && teacherIds.length > 0) {
        const teachers = await prisma.user.findMany({
          where: { id: { in: teacherIds }, role: 'TEACHER' },
          select: { id: true },
        });
        if (teachers.length !== teacherIds.length) {
          const validIds = new Set(teachers.map(t => t.id));
          const invalidId = teacherIds.find((tid: string) => !validIds.has(tid));
          throw AppError.badRequest(`User ${invalidId} is not a teacher`);
        }
        await courseRepository.syncTeachers(id, teacherIds);
      } else if (teacherIds !== undefined && teacherIds.length === 0) {
        await courseRepository.syncTeachers(id, teacherIds);
      }

      if (studentIds !== undefined && studentIds.length > 0) {
        const students = await prisma.user.findMany({
          where: { id: { in: studentIds }, role: 'STUDENT' },
          select: { id: true },
        });
        if (students.length !== studentIds.length) {
          const validIds = new Set(students.map(s => s.id));
          const invalidId = studentIds.find((sid: string) => !validIds.has(sid));
          throw AppError.badRequest(`User ${invalidId} is not a student`);
        }
        await courseRepository.syncStudents(id, studentIds);
      } else if (studentIds !== undefined && studentIds.length === 0) {
        await courseRepository.syncStudents(id, studentIds);
      }
    }

    return courseRepository.findById(id);
  },

  deleteCourse: async (id: string) => {
    const course = await courseRepository.findById(id);
    if (!course) throw AppError.notFound('Course not found');
    
    const oldImage = course.image;
    await courseRepository.delete(id);
    
    // Delete S3 asset if course is deleted successfully
    if (oldImage && oldImage.includes('amazonaws.com')) {
      try {
        const url = new URL(oldImage);
        const key = decodeURIComponent(url.pathname.substring(1));
        await deleteFromS3(key);
      } catch (err) {
        console.error('Failed to delete course image from S3 on deletion:', err);
      }
    }
    
    return { message: `Course "${course.title}" deleted` };
  },

  // ── Teacher Assignment ──────────────────────────────────────────────────────
  assignTeachers: async (courseId: string, input: AssignTeachersInput) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');

    // Validate all are TEACHER role (batch query)
    if (input.teacherIds && input.teacherIds.length > 0) {
      const teachers = await prisma.user.findMany({
        where: { id: { in: input.teacherIds }, role: 'TEACHER' },
        select: { id: true },
      });
      if (teachers.length !== input.teacherIds.length) {
        const validIds = new Set(teachers.map(t => t.id));
        const invalidId = input.teacherIds.find(id => !validIds.has(id));
        throw AppError.badRequest(`User ${invalidId} is not a teacher`);
      }
    }

    await courseRepository.assignTeachers(courseId, input.teacherIds);
    return courseRepository.getCourseTeachers(courseId);
  },

  removeTeacher: async (courseId: string, teacherId: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    await courseRepository.removeTeacher(courseId, teacherId);
    return { message: 'Teacher removed from course' };
  },

  getCourseTeachers: async (courseId: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    return courseRepository.getCourseTeachers(courseId);
  },

  // ── Student Enrollment ──────────────────────────────────────────────────────
  enrollStudents: async (courseId: string, input: EnrollStudentsInput, requesterRole: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');

    // Validate all are STUDENT role (batch query)
    if (input.studentIds && input.studentIds.length > 0) {
      const students = await prisma.user.findMany({
        where: { id: { in: input.studentIds }, role: 'STUDENT' },
        select: { id: true },
      });
      if (students.length !== input.studentIds.length) {
        const validIds = new Set(students.map(s => s.id));
        const invalidId = input.studentIds.find(id => !validIds.has(id));
        throw AppError.badRequest(`User ${invalidId} is not a student`);
      }
    }

    await courseRepository.enrollStudents(courseId, input.studentIds);
    return courseRepository.getCourseStudents(courseId);
  },

  // Student self-enrolls (if course is free/published)
  selfEnroll: async (courseId: string, studentId: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    if (!course.isPublished) throw AppError.forbidden('This course is not available for enrollment');

    const already = await courseRepository.isStudentEnrolled(courseId, studentId);
    if (already) throw AppError.conflict('You are already enrolled in this course');

    await courseRepository.enrollStudents(courseId, [studentId]);
    return { message: `Enrolled in ${course.title} successfully` };
  },

  unenrollStudent: async (courseId: string, studentId: string) => {
    await courseRepository.unenrollStudent(courseId, studentId);
    return { message: 'Student removed from course' };
  },

  updateEnrollmentProgress: async (courseId: string, studentId: string, progress: number) => {
    const enrollment = await courseRepository.isStudentEnrolled(courseId, studentId);
    if (!enrollment) throw AppError.forbidden('Not enrolled in this course');
    if (progress < 0 || progress > 100) throw AppError.badRequest('Progress must be between 0 and 100');
    return courseRepository.updateEnrollmentProgress(courseId, studentId, progress);
  },

  getCourseStudents: async (courseId: string, batchId?: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    const enrollments = await courseRepository.getCourseStudents(courseId, batchId);
    return Promise.all(
      enrollments.map(async (e: any) => ({
        ...e,
        student: e.student ? {
          ...e.student,
          avatar: await resolveS3Url(e.student.avatar),
        } : e.student
      }))
    );
  },

  // ── Lessons ────────────────────────────────────────────────────────────────
  getCourseLessons: async (courseId: string, durationDays?: any) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');
    const lessons = await courseRepository.getCourseLessons(courseId, durationDays);
    return Promise.all(
      lessons.map(async (lesson: any) => ({
        ...lesson,
        videoUrl: await resolveS3Url(lesson.videoUrl),
      }))
    );
  },

  createLesson: async (courseId: string, input: CreateLessonInput, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const assignment = await courseRepository.isTeacherAssigned(courseId, requesterId);
      if (!assignment) throw AppError.forbidden('Not assigned to this course');
    }

    const cleanedInput = {
      ...input,
      videoUrl: input.videoUrl ? stripPresignedParams(input.videoUrl) || '' : '',
    };

    return courseRepository.createLesson({ courseId, ...cleanedInput });
  },

  bulkUpdateLessons: async (courseId: string, input: BulkLessonsInput, requesterId: string, requesterRole: string, durationDays?: any) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const assignment = await courseRepository.isTeacherAssigned(courseId, requesterId);
      if (!assignment) throw AppError.forbidden('Not assigned to this course');
    }

    const cleanedLessons = input.lessons.map((lesson: any) => ({
      ...lesson,
      videoUrl: lesson.videoUrl ? stripPresignedParams(lesson.videoUrl) || '' : '',
    }));

    await courseRepository.bulkReplaceLessons(courseId, cleanedLessons, durationDays);
    return courseRepository.getCourseLessons(courseId, durationDays);
  },

  updateLesson: async (courseId: string, lessonId: string, input: UpdateLessonInput, requesterId: string, requesterRole: string) => {
    const course = await courseRepository.findById(courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const assignment = await courseRepository.isTeacherAssigned(courseId, requesterId);
      if (!assignment) throw AppError.forbidden('Not assigned to this course');
    }

    // Verify lesson belongs to this course
    const existingLesson = await prisma.lesson.findFirst({
      where: { id: lessonId, courseId },
    });
    if (!existingLesson) throw AppError.notFound('Lesson not found in this course');

    const updateData: any = { ...input };
    if (updateData.videoUrl) {
      updateData.videoUrl = stripPresignedParams(updateData.videoUrl) || '';
    }

    return courseRepository.updateLesson(lessonId, updateData);
  },
};
