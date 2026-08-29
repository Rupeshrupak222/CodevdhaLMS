import prisma from '../../config/database';
import { generateVerifyId } from '../../utils/crypto';
import { CertificateType } from '@prisma/client';

export const certificateRepository = {
  findAll: (filters: { studentId?: string; courseId?: string; skip: number; take: number }) => {
    const where: any = {};
    if (filters.studentId) where.studentId = filters.studentId;
    if (filters.courseId) where.courseId = filters.courseId;

    return Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
          course: { select: { id: true, title: true } },
        },
        skip: filters.skip,
        take: filters.take,
        orderBy: { issueDate: 'desc' },
      }),
      prisma.certificate.count({ where }),
    ]);
  },

  findById: (id: string) =>
    prisma.certificate.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true } },
      },
    }),

  findByVerifyId: (verifyId: string) =>
    prisma.certificate.findUnique({
      where: { verifyId },
      include: {
        student: { select: { id: true, name: true, email: true, avatar: true } },
        course: { select: { id: true, title: true } },
      },
    }),

  create: (data: { studentId: string; courseId: string; type: string; grade: string; startDate?: string; completionDate: string; durationMonths?: string }, issuedById: string) => {
    const verifyId = generateVerifyId();
    return prisma.certificate.create({
      data: {
        verifyId,
        studentId: data.studentId,
        courseId: data.courseId,
        type: data.type as CertificateType,
        grade: data.grade,
        startDate: data.startDate ? new Date(data.startDate) : null,
        completionDate: new Date(data.completionDate),
        durationMonths: data.durationMonths,
        issuedById,
      },
    });
  },

  delete: (id: string) =>
    prisma.certificate.delete({
      where: { id },
    }),
};
