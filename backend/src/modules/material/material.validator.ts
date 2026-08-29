import { z } from 'zod';

export const createMaterialSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['PDF', 'VIDEO', 'NOTES', 'RESOURCES']),
  courseId: z.string().min(1),
  description: z.string().optional(),
  url: z.string().min(1, 'URL is required'),
  size: z.string().optional(),
  section: z.string().optional(),
  batchId: z.string().min(1).optional().nullable(),
});

export const updateMaterialSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  type: z.enum(['PDF', 'VIDEO', 'NOTES', 'RESOURCES']).optional(),
  description: z.string().optional(),
});

export const materialListQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  batchId: z.string().optional(),
  type: z.enum(['PDF', 'VIDEO', 'NOTES', 'RESOURCES']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type MaterialListQuery = z.infer<typeof materialListQuerySchema>;
