import { z } from 'zod';

export const markAttendanceSchema = z.object({
  courseId: z.string(),
  date: z.string(),
  records: z.array(z.object({
    studentId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'NO_CLASS']),
    remarks: z.string().optional(),
  })).min(1),
});

export const editAttendanceSchema = z.object({
  courseId: z.string(),
  date: z.string(),
  records: z.array(z.object({
    studentId: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'NO_CLASS']),
    remarks: z.string().optional(),
  })).min(1),
});

export const attendanceQuerySchema = z.object({
  courseId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  studentId: z.string().optional(),
  batchId: z.string().optional(),
});

export const attendanceHistoryQuerySchema = z.object({
  courseId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  studentId: z.string().optional(),
  batchId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type EditAttendanceInput = z.infer<typeof editAttendanceSchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;
