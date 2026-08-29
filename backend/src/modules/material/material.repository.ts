import prisma from '../../config/database';
import { MaterialType } from '@prisma/client';

const materialSelect = {
  id: true,
  title: true,
  type: true,
  description: true,
  url: true,
  size: true,
  createdAt: true,
  course: { select: { id: true, title: true } },
  uploadedBy: { select: { id: true, name: true, role: true } },
};

export const materialRepository = {
  findAll: (filters: { courseId?: string; type?: MaterialType; skip: number; take: number }) => {
    const where: any = {};
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.type) where.type = filters.type;

    return Promise.all([
      prisma.material.findMany({
        where,
        select: materialSelect,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.material.count({ where }),
    ]);
  },

  findById: (id: string) => prisma.material.findUnique({ where: { id }, select: materialSelect }),

  create: (data: {
    title: string;
    type: MaterialType;
    courseId: string;
    description?: string;
    url: string;
    size?: string;
    s3Key?: string;
    uploadedById: string;
  }) => prisma.material.create({ data, select: materialSelect }),

  update: (id: string, data: Partial<{ title: string; type: MaterialType; description: string }>) =>
    prisma.material.update({ where: { id }, data, select: materialSelect }),

  delete: (id: string) => prisma.material.delete({ where: { id } }),
};
