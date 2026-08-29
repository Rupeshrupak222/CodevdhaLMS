import { z } from 'zod';

export const createCourseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Invalid category ID'),
  subcategory: z.string().optional(),
  duration: z.string().min(1, 'Duration is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional().default('ACTIVE'),
  image: z.string().optional(),
  price: z.number().min(0).optional().default(0),
  externalUrl: z.string().optional().nullable(),
  // Teachers to assign immediately on creation
  teacherIds: z.array(z.string()).optional().default([]),
  // Students to enroll immediately on creation
  studentIds: z.array(z.string()).optional().default([]),
});

export const updateCourseSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  categoryId: z.string().min(1).optional(),
  subcategory: z.string().optional(),
  duration: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  image: z.string().optional(),
  price: z.number().min(0).optional(),
  externalUrl: z.string().optional().nullable(),
  teacherIds: z.array(z.string()).optional(),
  studentIds: z.array(z.string()).optional(),
});

export const assignTeachersSchema = z.object({
  teacherIds: z.array(z.string()).min(1, 'Provide at least one teacher ID'),
});

export const enrollStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, 'Provide at least one student ID'),
});

export const courseListQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
  browse: z.string().optional(),
});

export const createLessonSchema = z.object({
  title: z.string().min(2).max(200),
  duration: z.string().min(1),
  durationDays: z.enum(['ALL', 'DAYS_30', 'DAYS_45', 'DAYS_90', 'DAYS_180']).optional().default('DAYS_90'),
  section: z.string().optional().default('General'),
  contentType: z.string().optional().default('VIDEO'),
  order: z.number().int().min(0),
  videoUrl: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
});

export const bulkLessonsSchema = z.object({
  lessons: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(2).max(200),
    duration: z.string().optional().default(''),
    durationDays: z.enum(['ALL', 'DAYS_30', 'DAYS_45', 'DAYS_90', 'DAYS_180']).optional().default('DAYS_90'),
    section: z.string().optional().default('General'),
    contentType: z.string().optional().default('VIDEO'),
    order: z.number().int().min(0),
    videoUrl: z.string().optional().or(z.literal('')),
    description: z.string().optional(),
  })),
});

export const updateLessonSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  duration: z.string().optional(),
  durationDays: z.enum(['ALL', 'DAYS_30', 'DAYS_45', 'DAYS_90', 'DAYS_180']).optional(),
  section: z.string().optional(),
  contentType: z.string().optional(),
  order: z.number().int().min(0).optional(),
  videoUrl: z.string().optional().or(z.literal('')),
  description: z.string().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type AssignTeachersInput = z.infer<typeof assignTeachersSchema>;
export type EnrollStudentsInput = z.infer<typeof enrollStudentsSchema>;
export type CourseListQuery = z.infer<typeof courseListQuerySchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type BulkLessonsInput = z.infer<typeof bulkLessonsSchema>;
