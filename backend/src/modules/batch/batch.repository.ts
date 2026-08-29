import prisma from '../../config/database';

// ── Duration day mapping ──────────────────────────────────────────────────────
export const DURATION_DAYS: Record<string, number> = {
  DAYS_30: 30,
  DAYS_45: 45,
  DAYS_90: 90,
  DAYS_180: 180,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export const computeEndDate = (startDate: Date, durationDays: string): Date => {
  const end = new Date(startDate);
  end.setDate(end.getDate() + (DURATION_DAYS[durationDays] ?? 90));
  return end;
};

// ── Selects ───────────────────────────────────────────────────────────────────
const batchListSelect = {
  id: true,
  courseId: true,
  name: true,
  durationDays: true,
  startDate: true,
  endDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  course: {
    select: { id: true, title: true },
  },
  _count: {
    select: { enrollments: true, quizzes: true, tasks: true, liveClasses: true },
  },
};

const batchDetailSelect = {
  ...batchListSelect,
  enrollments: {
    select: {
      progress: true,
      enrolledAt: true,
      student: { select: { id: true, name: true, email: true, avatar: true, isActive: true } },
    },
    orderBy: { enrolledAt: 'desc' as const },
  },
};

// ── Repository ────────────────────────────────────────────────────────────────
export const batchRepository = {
  create: (data: {
    courseId: string;
    name: string;
    durationDays: any;
    startDate: Date;
    endDate: Date;
  }) =>
    prisma.courseBatch.create({ data: data as any, select: batchDetailSelect }),

  findById: (id: string) =>
    prisma.courseBatch.findUnique({ where: { id }, select: batchDetailSelect }),

  findAll: (filters: {
    courseId?: string;
    isActive?: boolean;
    search?: string;
    skip: number;
    take: number;
  }) => {
    const where: any = {};
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { course: { title: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return Promise.all([
      prisma.courseBatch.findMany({
        where,
        select: batchListSelect,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.courseBatch.count({ where }),
    ]);
  },

  update: (id: string, data: Partial<{
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
  }>) =>
    prisma.courseBatch.update({ where: { id }, data, select: batchDetailSelect }),

  delete: async (id: string) => {
    return prisma.$transaction([
      prisma.quiz.deleteMany({ where: { batchId: id } }),
      prisma.material.deleteMany({ where: { batchId: id } }),
      prisma.task.deleteMany({ where: { batchId: id } }),
      prisma.liveClass.deleteMany({ where: { batchId: id } }),
      prisma.courseBatch.delete({ where: { id } }),
    ]);
  },

  // ── Student management ──────────────────────────────────────────────────────

  // Assign students already enrolled in the course to this batch
  assignStudentsToBatch: (batchId: string, courseId: string, studentIds: string[], durationDays: any) =>
    prisma.enrollment.updateMany({
      where: {
        courseId,
        studentId: { in: studentIds },
      },
      data: { batchId, durationDays },
    }),

  // Remove a student from this batch (student stays enrolled in course)
  removeStudentFromBatch: (batchId: string, studentId: string) =>
    prisma.enrollment.updateMany({
      where: { batchId, studentId },
      data: { batchId: null },
    }),

  // Get students in a batch
  getBatchStudents: (batchId: string) =>
    prisma.enrollment.findMany({
      where: { batchId },
      select: {
        progress: true,
        enrolledAt: true,
        student: { select: { id: true, name: true, email: true, avatar: true, isActive: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    }),

  // Get student's batch enrollment for a given course
  getStudentBatchEnrollment: (studentId: string, courseId: string) =>
    prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: {
        batchId: true,
        batch: {
          select: { id: true, name: true, startDate: true, endDate: true, isActive: true, durationDays: true },
        },
      },
    }),
};
