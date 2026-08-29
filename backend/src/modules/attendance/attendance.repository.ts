import prisma from '../../config/database';
import { AttendanceStatus } from '@prisma/client';

export const attendanceRepository = {
  getAttendance: (courseId: string, filters: { startDate?: Date; endDate?: Date; studentId?: string; batchId?: string }) => {
    const where: any = { courseId };
    
    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.batchId) {
      where.student = {
        enrollments: {
          some: {
            courseId,
            batchId: filters.batchId,
          },
        },
      };
    }

    return prisma.attendance.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { date: 'desc' },
    });
  },

  getAttendanceHistory: async (courseId: string, filters: { startDate?: Date; endDate?: Date; studentId?: string; batchId?: string; skip: number; take: number }) => {
    const where: any = { courseId };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = filters.startDate;
      if (filters.endDate) where.date.lte = filters.endDate;
    }

    if (filters.studentId) {
      where.studentId = filters.studentId;
    }

    if (filters.batchId) {
      where.student = {
        enrollments: {
          some: {
            courseId,
            batchId: filters.batchId,
          },
        },
      };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          student: { select: { id: true, name: true, email: true, avatar: true } },
        },
        skip: filters.skip,
        take: filters.take,
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return { records, total };
  },

  markAttendance: async (courseId: string, date: Date, markedById: string, records: { studentId: string; status: AttendanceStatus; remarks?: string }[]) => {
    // Upsert each record
    const promises = records.map(record => 
      prisma.attendance.upsert({
        where: { studentId_courseId_date: { studentId: record.studentId, courseId, date } },
        update: { status: record.status, remarks: record.remarks },
        create: { studentId: record.studentId, courseId, date, status: record.status, remarks: record.remarks, markedById },
      })
    );
    return prisma.$transaction(promises);
  },

  editAttendance: async (courseId: string, date: Date, records: { studentId: string; status: AttendanceStatus; remarks?: string }[]) => {
    const promises = records.map(record =>
      prisma.attendance.update({
        where: { studentId_courseId_date: { studentId: record.studentId, courseId, date } },
        data: { status: record.status, remarks: record.remarks },
      })
    );
    return prisma.$transaction(promises);
  },
};
