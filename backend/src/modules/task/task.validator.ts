import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1),
  courseId: z.string().min(1),
  batchId: z.string().uuid('Invalid Batch ID').optional().nullable(),
  dueDate: z.string().datetime(), // ISO string
  attachmentUrl: z.string().url().optional(),
  studentIds: z.array(z.string().min(1)).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'SUBMITTED', 'REVIEWED']).optional(),
});

export const submitTaskSchema = z.object({
  comment: z.string().optional(),
  githubUrl: z.string().url().optional(),
  fileUrl: z.string().url().optional(),
}).refine(data => data.githubUrl || data.fileUrl || data.comment, {
  message: 'Submission must contain at least a file, github URL, or a comment',
});

export const gradeTaskSchema = z.object({
  grade: z.enum(['O', 'A_PLUS', 'A', 'B_PLUS', 'B', 'C', 'D']),
  feedback: z.string().default(''),
});

export const taskListQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  batchId: z.string().optional(),
  status: z.enum(['PENDING', 'SUBMITTED', 'REVIEWED']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type SubmitTaskInput = z.infer<typeof submitTaskSchema>;
export type GradeTaskInput = z.infer<typeof gradeTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
