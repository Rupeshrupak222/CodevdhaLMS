import { z } from 'zod';

export const createLiveClassSchema = z.object({
  title: z.string().min(3).max(200),
  courseId: z.string().min(1),
  batchId: z.string().uuid('Invalid Batch ID').optional().nullable(),
  type: z.enum(['LIVE', 'UPCOMING', 'RECORDED']),
  status: z.enum(['LIVE_NOW', 'SCHEDULED', 'COMPLETED', 'CANCELLED']),
  scheduledAt: z.string().datetime(), // ISO string
  duration: z.string().optional(),
  meetingLink: z.string().url(),
});

export const updateLiveClassSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  type: z.enum(['LIVE', 'UPCOMING', 'RECORDED']).optional(),
  status: z.enum(['LIVE_NOW', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.string().optional(),
  meetingLink: z.string().url().optional(),
  cancelReason: z.string().optional(),
  recordingUrl: z.string().url().optional().nullable(),
});

export const liveClassListQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  batchId: z.string().optional(),
  type: z.enum(['LIVE', 'UPCOMING', 'RECORDED']).optional(),
  status: z.enum(['LIVE_NOW', 'SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateLiveClassInput = z.infer<typeof createLiveClassSchema>;
export type UpdateLiveClassInput = z.infer<typeof updateLiveClassSchema>;
export type LiveClassListQuery = z.infer<typeof liveClassListQuerySchema>;
