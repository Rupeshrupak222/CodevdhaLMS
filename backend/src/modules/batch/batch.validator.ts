import { z } from 'zod';

// ── Create Batch ──────────────────────────────────────────────────────────────
export const createBatchSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  name: z.string().min(2, 'Batch name must be at least 2 characters').max(100),
  startDate: z.string().min(1, 'Start date is required'),
  durationDays: z.enum(['DAYS_30', 'DAYS_45', 'DAYS_90', 'DAYS_180']).optional().default('DAYS_90'),
});

// ── Update Batch ──────────────────────────────────────────────────────────────
export const updateBatchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  startDate: z.string().optional(),
  durationDays: z.enum(['DAYS_30', 'DAYS_45', 'DAYS_90', 'DAYS_180']).optional(),
  isActive: z.boolean().optional(),
});

// ── List Batches Query ────────────────────────────────────────────────────────
export const batchListQuerySchema = z.object({
  courseId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// ── Assign Students ───────────────────────────────────────────────────────────
export const assignStudentsToBatchSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'Provide at least one student ID'),
});

// ── Types ─────────────────────────────────────────────────────────────────────
export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
export type BatchListQuery = z.infer<typeof batchListQuerySchema>;
export type AssignStudentsToBatchInput = z.infer<typeof assignStudentsToBatchSchema>;
