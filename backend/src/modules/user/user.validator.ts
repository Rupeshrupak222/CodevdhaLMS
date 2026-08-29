import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
  avatar: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  avatar: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  courseIds: z.array(z.string()).optional(),
  enrollments: z.array(z.object({
    courseId: z.string(),
    batchId: z.string().nullable().optional(),
    durationDays: z.enum(['DAYS_30', 'DAYS_45', 'DAYS_90', 'DAYS_180']).optional(),
  })).optional(),
});

export const userListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
