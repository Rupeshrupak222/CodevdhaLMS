import prisma from '../../config/database';
import { CreateQuizInput, UpdateQuizInput } from './quiz.validator';
import { QuestionType } from '@prisma/client';

export const quizRepository = {
  findAll: (filters: { courseId?: string; courseIds?: string[]; isPublished?: boolean; batchId?: string | null; batchIds?: (string | null)[]; courseBatchPairs?: Array<{ courseId: string; batchId: string | null }>; skip: number; take: number }) => {
    const where: any = {};
    if (filters.courseId) {
      where.courseId = filters.courseId;
    } else if (filters.courseIds && !filters.courseBatchPairs) {
      where.courseId = { in: filters.courseIds };
    }
    if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;

    // Per-course batch filtering: each course has its own allowed batchIds
    if (filters.courseBatchPairs) {
      where.OR = filters.courseBatchPairs.map((pair) => ({
        courseId: pair.courseId,
        batchId: pair.batchId,
      }));
    } else if (filters.batchIds !== undefined) {
      // Batch-aware filter: show quizzes for student's batch OR course-wide (batchId=null)
      where.OR = filters.batchIds.map((bid: string | null) => ({ batchId: bid }));
    } else if (filters.batchId !== undefined) {
      where.batchId = filters.batchId;
    }

    return Promise.all([
      prisma.quiz.findMany({
        where,
        select: {
          id: true,
          title: true,
          durationMinutes: true,
          isPublished: true,
          createdAt: true,
          courseId: true,
          batchId: true,
          course: { select: { id: true, title: true } },
          batch: { select: { id: true, name: true } },
          _count: { select: { questions: true, attempts: true } },
        },
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.quiz.count({ where }),
    ]);
  },

  findById: (id: string, includeAnswers: boolean = false) =>
    prisma.quiz.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            question: true,
            order: true,
            answer: includeAnswers, // Hide answer from students
            options: {
              orderBy: { order: 'asc' },
              select: { id: true, text: true, order: true },
            },
          },
        },
      },
    }),

  create: (data: CreateQuizInput, createdById: string) => {
    return prisma.quiz.create({
      data: {
        title: data.title,
        durationMinutes: data.durationMinutes,
        isPublished: data.isPublished,
        courseId: data.courseId,
        batchId: data.batchId ?? null,
        createdById,
        questions: {
          create: data.questions.map((q) => ({
            type: q.type as QuestionType,
            question: q.question,
            answer: q.answer,
            order: q.order,
            options: {
              create: q.options.map((o) => ({
                text: o.text,
                order: o.order,
              })),
            },
          })),
        },
      },
      include: { questions: { include: { options: true } } },
    });
  },

  update: async (id: string, data: UpdateQuizInput) => {
    // Wrap in transaction to prevent data loss if recreate fails
    return prisma.$transaction(async (tx) => {
      // If updating questions, delete old ones and recreate atomically
      if (data.questions) {
        await tx.quizQuestion.deleteMany({ where: { quizId: id } });
      }

      return tx.quiz.update({
        where: { id },
        data: {
          title: data.title,
          durationMinutes: data.durationMinutes,
          isPublished: data.isPublished,
          ...(data.questions && {
            questions: {
              create: data.questions.map((q) => ({
                type: q.type as QuestionType,
                question: q.question,
                answer: q.answer,
                order: q.order,
                options: {
                  create: q.options.map((o) => ({
                    text: o.text,
                    order: o.order,
                  })),
                },
              })),
            },
          }),
        },
      });
    });
  },

  delete: (id: string) => prisma.quiz.delete({ where: { id } }),

  // ── Attempts ───────────────────────────────────────────────────────────────

  findAttempt: (quizId: string, studentId: string) =>
    prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId } },
    }),

  findAttemptsForQuiz: (quizId: string) =>
    prisma.quizAttempt.findMany({
      where: { quizId },
      include: { student: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 100, // Cap at 100 results to prevent unbounded queries
    }),

  createAttempt: (data: {
    quizId: string;
    studentId: string;
    score: number;
    total: number;
    percentage: number;
    answers: any;
  }) => prisma.quizAttempt.create({ data }),
};
