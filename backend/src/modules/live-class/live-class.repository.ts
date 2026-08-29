import prisma from '../../config/database';
import { CreateLiveClassInput, UpdateLiveClassInput } from './live-class.validator';
import { ClassType, ClassStatus } from '@prisma/client';

export const liveClassRepository = {
  findAll: (filters: {
    courseId?: string;
    courseIds?: string[];
    batchId?: string | null;
    type?: ClassType;
    status?: ClassStatus;
    skip: number;
    take: number;
  }) => {
    const where: any = {};
    if (filters.courseId) where.courseId = filters.courseId;
    if (!filters.courseId && filters.courseIds) {
      where.courseId = { in: filters.courseIds };
    }
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    // Batch-aware: show live classes for this batch AND course-wide (null batch) classes
    if (filters.batchId !== undefined) {
      if (filters.batchId === null) {
        where.batchId = null;
      } else {
        where.OR = [
          { batchId: filters.batchId },
          { batchId: null },
        ];
      }
    }

    return Promise.all([
      prisma.liveClass.findMany({
        where,
        include: {
          course: { select: { id: true, title: true } },
          teacher: { select: { id: true, name: true, avatar: true, role: true } },
          batch: { select: { id: true, name: true } },
        },
        skip: filters.skip,
        take: filters.take,
        orderBy: { scheduledAt: 'asc' },
      }),
      prisma.liveClass.count({ where }),
    ]);
  },

  findById: (id: string) =>
    prisma.liveClass.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true, avatar: true, role: true } },
      },
    }),

  create: (data: CreateLiveClassInput, teacherId: string) => {
    return prisma.liveClass.create({
      data: {
        title: data.title,
        courseId: data.courseId,
        batchId: data.batchId ?? null,
        teacherId,
        type: data.type as ClassType,
        status: data.status as ClassStatus,
        scheduledAt: new Date(data.scheduledAt),
        duration: data.duration,
        meetingLink: data.meetingLink,
      },
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true, avatar: true, role: true } },
        batch: { select: { id: true, name: true } },
      },
    });
  },

  update: (id: string, data: UpdateLiveClassInput) => {
    const updateData: any = { ...data };
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);
    return prisma.liveClass.update({
      where: { id },
      data: updateData,
      include: {
        course: { select: { id: true, title: true } },
        teacher: { select: { id: true, name: true, avatar: true, role: true } },
      },
    });
  },

  delete: (id: string) =>
    prisma.liveClass.delete({
      where: { id },
    }),
};
