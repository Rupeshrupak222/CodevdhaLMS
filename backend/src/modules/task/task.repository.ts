import prisma from '../../config/database';
import { TaskStatus, Grade } from '@prisma/client';

export const taskRepository = {
  findAll: (filters: { courseId?: string; studentId?: string; teacherId?: string; status?: TaskStatus; batchId?: string | null; studentBatchFilter?: { courseId: string; batchId: string | null }[]; skip: number; take: number }) => {
    const where: any = {};
    if (filters.courseId) where.courseId = filters.courseId;

    if (filters.studentId) {
      // If studentBatchFilter is provided, use enrollment-based visibility
      // (shows tasks by batch membership, so new students in a batch see all batch tasks)
      if (filters.studentBatchFilter && filters.studentBatchFilter.length > 0) {
        const batchConditions: any[] = [];
        for (const enrollment of filters.studentBatchFilter) {
          if (enrollment.batchId) {
            // Tasks specifically for the student's batch
            batchConditions.push({ courseId: enrollment.courseId, batchId: enrollment.batchId });
          }
          // Course-wide tasks (batchId is null) for enrolled course
          batchConditions.push({ courseId: enrollment.courseId, batchId: null });
        }
        where.OR = batchConditions;
      } else {
        // Fallback: use TaskAssignment if no batch filter info
        where.assignedStudents = { some: { studentId: filters.studentId } };
      }
    }

    if (filters.teacherId) {
      where.course = { teachers: { some: { teacherId: filters.teacherId } } };
    }

    // Batch-aware filter: show tasks strictly for this batch (admin/teacher view)
    if (filters.batchId !== undefined && !filters.studentBatchFilter) {
      where.batchId = filters.batchId;
    }

    return Promise.all([
      prisma.task.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
          batch: { select: { id: true, name: true } },
          _count: { select: { submissions: true, assignedStudents: true } },
          ...(filters.studentId && {
            submissions: {
              where: { studentId: filters.studentId },
              select: { status: true, grade: true },
            },
          }),
        },
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where }),
    ]);
  },

  findById: (id: string, includeSubmissions: boolean = false) =>
    prisma.task.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        assignedStudents: {
          include: { student: { select: { id: true, name: true, avatar: true } } },
        },
        ...(includeSubmissions && {
          submissions: {
            include: { student: { select: { id: true, name: true, avatar: true } } },
            orderBy: { submittedAt: 'desc' },
          },
        }),
      },
    }),

  create: (data: {
    title: string;
    description: string;
    courseId: string;
    batchId?: string | null;
    dueDate: Date;
    attachmentUrl?: string;
    createdById: string;
    studentIds: string[];
  }) =>
    prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        courseId: data.courseId,
        batchId: data.batchId ?? null,
        dueDate: data.dueDate,
        attachmentUrl: data.attachmentUrl,
        createdById: data.createdById,
        assignedStudents: {
          create: data.studentIds.map(id => ({ studentId: id })),
        },
      },
    }),

  update: (id: string, data: any) => prisma.task.update({ where: { id }, data }),

  delete: (id: string) => prisma.task.delete({ where: { id } }),

  // ── Submissions ────────────────────────────────────────────────────────────

  findSubmission: (taskId: string, studentId: string) =>
    prisma.taskSubmission.findUnique({
      where: { taskId_studentId: { taskId, studentId } },
    }),

  upsertSubmission: (data: {
    taskId: string;
    studentId: string;
    comment?: string;
    githubUrl?: string;
    fileUrl?: string;
    isLate?: boolean;
  }) =>
    prisma.taskSubmission.upsert({
      where: { taskId_studentId: { taskId: data.taskId, studentId: data.studentId } },
      update: {
        comment: data.comment,
        githubUrl: data.githubUrl,
        fileUrl: data.fileUrl,
        isLate: data.isLate ?? false,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        taskId: data.taskId,
        studentId: data.studentId,
        comment: data.comment,
        githubUrl: data.githubUrl,
        fileUrl: data.fileUrl,
        isLate: data.isLate ?? false,
        status: 'SUBMITTED',
      },
    }),

  gradeSubmission: (id: string, data: { grade: Grade; feedback: string }) =>
    prisma.taskSubmission.update({
      where: { id },
      data: {
        grade: data.grade,
        feedback: data.feedback,
        status: 'REVIEWED',
        reviewedAt: new Date(),
      },
    }),
};
