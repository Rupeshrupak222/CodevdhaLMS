import prisma from '../../config/database';
import { Role } from '@prisma/client';

// Safe user select (no passwordHash)
const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  avatar: true,
  isActive: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
  enrollments: {
    select: {
      courseId: true,
      progress: true,
      durationDays: true,
      batchId: true,
      batch: {
        select: {
          name: true,
        }
      },
      course: {
        select: {
          title: true,
        }
      }
    }
  },
  taughtCourses: {
    select: {
      courseId: true,
      course: {
        select: {
          title: true,
        }
      }
    }
  },
  attendances: {
    select: {
      id: true,
      courseId: true,
      date: true,
      status: true,
    }
  },
  quizAttempts: {
    select: {
      id: true,
      score: true,
      percentage: true,
      quiz: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true,
            }
          }
        }
      }
    }
  },
  taskSubmissions: {
    select: {
      id: true,
      grade: true,
      task: {
        select: {
          id: true,
          title: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true,
            }
          }
        }
      }
    }
  },
  weeklyScores: {
    select: {
      score: true,
      weekLabel: true,
    },
    orderBy: {
      createdAt: 'asc' as const
    }
  }
};

export const userRepository = {
  // ── Find ────────────────────────────────────────────────────────────────────
  findAll: (filters: {
    role?: Role;
    search?: string;
    isActive?: boolean;
    skip: number;
    take: number;
  }) => {
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return Promise.all([
      prisma.user.findMany({
        where,
        select: safeSelect,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);
  },

  findById: (id: string) =>
    prisma.user.findUnique({ where: { id }, select: safeSelect }),

  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email: email.toLowerCase() } }),

  // ── Create (Admin creating users) ──────────────────────────────────────────
  create: (data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
    avatar?: string | null;
  }) =>
    prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        settings: { create: {} },
      },
      select: safeSelect,
    }),

  update: (id: string, data: {
    name?: string;
    email?: string;
    avatar?: string | null;
    isActive?: boolean;
    passwordHash?: string;
  }) =>
    prisma.user.update({
      where: { id },
      data,
      select: safeSelect,
    }),

  // ── Delete ──────────────────────────────────────────────────────────────────
  delete: (id: string) =>
    prisma.user.delete({ where: { id }, select: safeSelect }),

  // ── Sync Enrollments ────────────────────────────────────────────────────────
  syncEnrollments: async (studentId: string, courseIds: string[]) => {
    await prisma.enrollment.deleteMany({
      where: {
        studentId,
        courseId: { notIn: courseIds },
      },
    });

    if (courseIds.length > 0) {
      await prisma.enrollment.createMany({
        data: courseIds.map(courseId => ({
          studentId,
          courseId,
        })),
        skipDuplicates: true,
      });
    }
  },

  syncEnrollmentsWithSettings: async (
    studentId: string,
    enrollments: Array<{ courseId: string; batchId?: string | null; durationDays?: any }>
  ) => {
    const courseIds = enrollments.map(e => e.courseId);
    // Delete enrollments not in active list
    await prisma.enrollment.deleteMany({
      where: {
        studentId,
        courseId: { notIn: courseIds },
      },
    });

    // Upsert each enrollment
    for (const item of enrollments) {
      let finalDurationDays = item.durationDays || 'DAYS_90';
      if (item.batchId) {
        const batch = await prisma.courseBatch.findUnique({
          where: { id: item.batchId },
          select: { durationDays: true }
        });
        if (batch) {
          finalDurationDays = batch.durationDays;
        }
      }
      const data = {
        batchId: item.batchId || null,
        durationDays: finalDurationDays,
      };
      await prisma.enrollment.upsert({
        where: {
          studentId_courseId: { studentId, courseId: item.courseId },
        },
        create: {
          studentId,
          courseId: item.courseId,
          ...data,
        },
        update: data,
      });
    }
  },

  // ── Stats for dashboard ─────────────────────────────────────────────────────
  countByRole: () =>
    prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    }),
};
