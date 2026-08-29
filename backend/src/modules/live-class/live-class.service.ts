import { liveClassRepository } from './live-class.repository';
import { courseRepository } from '../course/course.repository';
import { AppError } from '../../utils/apiError';
import { parsePaginationParams, buildPaginationMeta } from '../../utils/response';
import { CreateLiveClassInput, UpdateLiveClassInput, LiveClassListQuery } from './live-class.validator';
import { ClassType, ClassStatus } from '@prisma/client';
import prisma from '../../config/database';
import { resolveS3Url } from '../../utils/s3';
import { sendLiveClassScheduledEmail } from '../../utils/email';

export const liveClassService = {
  listLiveClasses: async (query: LiveClassListQuery, requesterId: string, requesterRole: string) => {
    const { page, limit, skip } = parsePaginationParams(query);

    const filters: any = {
      skip,
      take: limit,
      courseId: query.courseId,
      type: query.type as ClassType,
      status: query.status as ClassStatus,
    };

    if (requesterRole === 'STUDENT') {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: requesterId },
        select: { courseId: true, batchId: true },
      });
      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      if (filters.courseId && !enrolledCourseIds.includes(filters.courseId)) {
        throw AppError.forbidden('Not enrolled in this course');
      }

      if (filters.courseId) {
        // Batch-aware: get this student's batchId for this course
        const enrollment = enrollments.find(e => e.courseId === filters.courseId);
        if (enrollment && enrollment.batchId) {
          filters.batchId = enrollment.batchId;
        }
        // If student has no batch, don't filter by batchId — show all classes for the course
      } else {
        if (enrolledCourseIds.length === 0) {
          return { classes: [], meta: buildPaginationMeta({ page, limit, total: 0 }) };
        }
        filters.courseIds = enrolledCourseIds;
      }
    }

    if (requesterRole === 'TEACHER') {
      if (filters.courseId) {
        const isAssigned = await courseRepository.isTeacherAssigned(filters.courseId, requesterId);
        if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
      } else {
        const assigned = await prisma.courseTeacher.findMany({
          where: { teacherId: requesterId },
          select: { courseId: true },
        });
        const assignedCourseIds = assigned.map((item) => item.courseId);
        if (assignedCourseIds.length === 0) {
          return { classes: [], meta: buildPaginationMeta({ page, limit, total: 0 }) };
        }
        filters.courseIds = assignedCourseIds;
      }
    }

    if (requesterRole !== 'STUDENT') {
      if (query.batchId !== undefined) {
        filters.batchId = query.batchId === 'null' || query.batchId === '' ? null : query.batchId;
      }
    }

    const [classes, total] = await liveClassRepository.findAll(filters);
    const resolvedClasses = await Promise.all(
      classes.map(async (cls: any) => {
        if (cls.teacher) {
          cls.teacher.avatar = await resolveS3Url(cls.teacher.avatar);
        }
        if (cls.recordingUrl) {
          cls.recordingUrl = await resolveS3Url(cls.recordingUrl);
        }
        return cls;
      })
    );
    return { classes: resolvedClasses, meta: buildPaginationMeta({ page, limit, total }) };
  },

  getLiveClass: async (id: string, requesterId: string, requesterRole: string) => {
    const liveClass = await liveClassRepository.findById(id);
    if (!liveClass) throw AppError.notFound('Live room not found');

    if (requesterRole === 'STUDENT') {
      const isEnrolled = await courseRepository.isStudentEnrolled(liveClass.course.id, requesterId);
      if (!isEnrolled) throw AppError.forbidden('Not enrolled in this course');
    }

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(liveClass.course.id, requesterId);
      if (!isAssigned) throw AppError.forbidden('Not assigned to this course');
    }

    if (liveClass.teacher) {
      liveClass.teacher.avatar = await resolveS3Url(liveClass.teacher.avatar);
    }

    if ((liveClass as any).recordingUrl) {
      (liveClass as any).recordingUrl = await resolveS3Url((liveClass as any).recordingUrl);
    }

    return liveClass;
  },

  createLiveClass: async (input: CreateLiveClassInput, teacherId: string, requesterRole: string) => {
    const course = await courseRepository.findById(input.courseId);
    if (!course) throw AppError.notFound('Course not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(input.courseId, teacherId);
      if (!isAssigned) throw AppError.forbidden('Can only create rooms for assigned courses');
    }

    const createdClass = await liveClassRepository.create(input, teacherId);
    if (createdClass.teacher) {
      createdClass.teacher.avatar = await resolveS3Url(createdClass.teacher.avatar);
    }

    // Send email notification to students in this course+batch asynchronously
    (async () => {
      try {
        // Build enrollment filter: course + batch (if provided)
        const enrollmentWhere: any = { courseId: input.courseId };
        if (input.batchId) {
          enrollmentWhere.batchId = input.batchId;
        }

        const enrollments = await prisma.enrollment.findMany({
          where: enrollmentWhere,
          include: {
            student: { select: { email: true, name: true } },
          },
        });

        const students = enrollments
          .filter((e) => e.student)
          .map((e) => ({ email: e.student.email, name: e.student.name }));

        if (students.length > 0) {
          const teacher = await prisma.user.findUnique({
            where: { id: teacherId },
            select: { name: true },
          });

          await sendLiveClassScheduledEmail(students, {
            title: createdClass.title,
            courseName: createdClass.course.title,
            batchName: createdClass.batch?.name ?? null,
            scheduledAt: createdClass.scheduledAt,
            duration: createdClass.duration,
            meetingLink: createdClass.meetingLink,
            teacherName: teacher?.name || 'Instructor',
          });
        }
      } catch (err) {
        console.error('[Live Class] Failed to send scheduled class notifications:', err);
      }
    })();

    return createdClass;
  },

  updateLiveClass: async (id: string, input: UpdateLiveClassInput, teacherId: string, requesterRole: string) => {
    const liveClass = await liveClassRepository.findById(id);
    if (!liveClass) throw AppError.notFound('Live room not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(liveClass.courseId, teacherId);
      if (!isAssigned) throw AppError.forbidden('Can only update rooms for assigned courses');
    }

    const updatedClass = await liveClassRepository.update(id, input);
    if (updatedClass.teacher) {
      updatedClass.teacher.avatar = await resolveS3Url(updatedClass.teacher.avatar);
    }
    return updatedClass;
  },

  deleteLiveClass: async (id: string, teacherId: string, requesterRole: string) => {
    const liveClass = await liveClassRepository.findById(id);
    if (!liveClass) throw AppError.notFound('Live room not found');

    if (requesterRole === 'TEACHER') {
      const isAssigned = await courseRepository.isTeacherAssigned(liveClass.courseId, teacherId);
      if (!isAssigned) throw AppError.forbidden('Can only delete rooms for assigned courses');
    }

    await liveClassRepository.delete(id);
    return { message: 'Live room deleted successfully' };
  },
};
