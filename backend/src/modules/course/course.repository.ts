import prisma from '../../config/database';
import { CourseStatus } from '@prisma/client';

// Full course select with teacher and student counts
const courseListSelect = {
  id: true,
  title: true,
  description: true,
  subcategory: true,
  duration: true,
  status: true,
  image: true,
  rating: true,
  price: true,
  isPublished: true,
  externalUrl: true,
  createdAt: true,
  updatedAt: true,
  categoryId: true,
  category: { select: { id: true, name: true, slug: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  teachers: {
    select: {
      teacher: { select: { id: true, name: true, email: true, avatar: true } },
      assignedAt: true,
    },
  },
  _count: {
    select: {
      enrollments: true,
      lessons: true,
      quizzes: true,
      tasks: true,
      batches: true,
    },
  },
};

const courseDetailSelect = {
  ...courseListSelect,
  lessons: {
    orderBy: {
      order: 'asc' as const
    }
  },
};

export const courseRepository = {
  // ── Categories ─────────────────────────────────────────────────────────────
  findAllCategories: () =>
    prisma.category.findMany({ orderBy: { name: 'asc' } }),

  findCategoryById: (id: string) =>
    prisma.category.findUnique({ where: { id } }),

  createCategory: (data: { name: string; slug: string }) =>
    prisma.category.create({ data }),

  // ── Courses ────────────────────────────────────────────────────────────────
  findAll: (filters: {
    status?: CourseStatus;
    categoryId?: string;
    search?: string;
    teacherId?: string;   // filter by assigned teacher
    studentId?: string;   // filter by enrolled student
    skip: number;
    take: number;
  }) => {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    // Filter courses where a specific teacher is assigned
    if (filters.teacherId) {
      where.teachers = { some: { teacherId: filters.teacherId } };
    }
    // Filter courses where a student is enrolled
    if (filters.studentId) {
      where.enrollments = { some: { studentId: filters.studentId } };
    }

    return Promise.all([
      prisma.course.findMany({
        where,
        select: courseListSelect,
        skip: filters.skip,
        take: filters.take,
        orderBy: { title: 'asc' },
      }),
      prisma.course.count({ where }),
    ]);
  },

  findById: (id: string) =>
    prisma.course.findUnique({ where: { id }, select: courseDetailSelect }),

  create: (data: {
    title: string;
    description?: string;
    categoryId: string;
    subcategory?: string;
    duration: string;
    status: CourseStatus;
    image?: string;
    price: number;
    externalUrl?: string | null;
    createdById: string;
  }) =>
    prisma.course.create({ data: data as any, select: courseDetailSelect }),

  update: (id: string, data: Partial<{
    title: string;
    description: string;
    categoryId: string;
    subcategory: string;
    duration: string;
    status: CourseStatus;
    image: string;
    price: number;
    isPublished: boolean;
    externalUrl: string | null;
  }>) =>
    prisma.course.update({ where: { id }, data: data as any, select: courseDetailSelect }),

  delete: (id: string) =>
    prisma.course.delete({ where: { id } }),

  // ── Teacher Assignment ──────────────────────────────────────────────────────
  assignTeachers: (courseId: string, teacherIds: string[]) =>
    prisma.courseTeacher.createMany({
      data: teacherIds.map(teacherId => ({ courseId, teacherId })),
      skipDuplicates: true,
    }),

  removeTeacher: (courseId: string, teacherId: string) =>
    prisma.courseTeacher.delete({
      where: { courseId_teacherId: { courseId, teacherId } },
    }),

  getCourseTeachers: (courseId: string) =>
    prisma.courseTeacher.findMany({
      where: { courseId },
      include: {
        teacher: { select: { id: true, name: true, email: true, avatar: true } },
      },
    }),

  isTeacherAssigned: (courseId: string, teacherId: string) =>
    prisma.courseTeacher.findUnique({
      where: { courseId_teacherId: { courseId, teacherId } },
    }),

  // ── Student Enrollment ──────────────────────────────────────────────────────
  enrollStudents: (courseId: string, studentIds: string[]) =>
    prisma.enrollment.createMany({
      data: studentIds.map(studentId => ({ courseId, studentId })),
      skipDuplicates: true,
    }),

  unenrollStudent: (courseId: string, studentId: string) =>
    prisma.enrollment.delete({
      where: { studentId_courseId: { studentId, courseId } },
    }),

  getCourseStudents: (courseId: string, batchId?: string) => {
    const where: any = { courseId };
    if (batchId) {
      where.batchId = batchId;
    }
    return prisma.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        batch: { select: { id: true, name: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  },

  isStudentEnrolled: (courseId: string, studentId: string) =>
    prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    }),

  // ── Lessons ────────────────────────────────────────────────────────────────
  getCourseLessons: (courseId: string, durationDays?: any) => {
    const where: any = { courseId };
    if (durationDays) {
      where.durationDays = durationDays;
    }
    return prisma.lesson.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  },

  createLesson: (data: {
    courseId: string;
    title: string;
    duration: string;
    durationDays?: any;
    section?: string;
    contentType?: string;
    order: number;
    videoUrl?: string;
    description?: string;
  }) => prisma.lesson.create({ data }),

  updateLesson: (id: string, data: Partial<{
    title: string;
    duration: string;
    durationDays: any;
    section: string;
    contentType: string;
    order: number;
    videoUrl: string;
    description: string;
  }>) => prisma.lesson.update({ where: { id }, data }),

  deleteLesson: (id: string) => prisma.lesson.delete({ where: { id } }),

  updateEnrollmentProgress: (courseId: string, studentId: string, progress: number) =>
    prisma.enrollment.update({
      where: { studentId_courseId: { studentId, courseId } },
      data: { progress },
    }),

  bulkReplaceLessons: async (courseId: string, lessons: any[], durationDays?: any) => {
    // Use a transaction so that if createMany fails, the deleteMany is rolled back
    return prisma.$transaction(async (tx) => {
      // Only delete lessons of the matching duration!
      const deleteWhere: any = { courseId };
      if (durationDays) {
        deleteWhere.durationDays = durationDays;
      }
      await tx.lesson.deleteMany({ where: deleteWhere });
      if (lessons.length === 0) return [];
      return tx.lesson.createMany({
        data: lessons.map((l, idx) => ({
          courseId,
          title: l.title,
          duration: l.duration,
          durationDays: l.durationDays || durationDays || 'DAYS_90',
          section: l.section || 'General',
          contentType: l.contentType || 'VIDEO',
          order: l.order ?? idx + 1,
          videoUrl: l.videoUrl || null,
          description: l.description || null,
        })),
      });
    });
  },

  syncTeachers: async (courseId: string, teacherIds: string[]) => {
    await prisma.courseTeacher.deleteMany({
      where: {
        courseId,
        teacherId: { notIn: teacherIds },
      },
    });

    if (teacherIds.length > 0) {
      await prisma.courseTeacher.createMany({
        data: teacherIds.map(teacherId => ({ courseId, teacherId })),
        skipDuplicates: true,
      });
    }
  },

  syncStudents: async (courseId: string, studentIds: string[]) => {
    await prisma.enrollment.deleteMany({
      where: {
        courseId,
        studentId: { notIn: studentIds },
      },
    });

    if (studentIds.length > 0) {
      await prisma.enrollment.createMany({
        data: studentIds.map(studentId => ({ courseId, studentId })),
        skipDuplicates: true,
      });
    }
  },
};
