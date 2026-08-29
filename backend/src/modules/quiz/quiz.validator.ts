import { z } from 'zod';

export const quizOptionSchema = z.object({
  text: z.string().min(1),
  order: z.number().int().min(1),
});

export const quizQuestionSchema = z.object({
  type: z.enum(['MCQ', 'TRUE_FALSE', 'SINGLE_CHOICE']),
  question: z.string().min(3),
  answer: z.string().min(1), // correct option text
  order: z.number().int().min(1),
  options: z.array(quizOptionSchema).min(2),
});

export const createQuizSchema = z.object({
  title: z.string().min(3).max(200),
  courseId: z.string().min(1),
  batchId: z.string().uuid('Invalid Batch ID').optional().nullable(),
  durationMinutes: z.number().int().min(1).optional().default(10),
  isPublished: z.boolean().optional().default(true),
  questions: z.array(quizQuestionSchema).min(1),
});

export const updateQuizSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  durationMinutes: z.number().int().min(1).optional(),
  isPublished: z.boolean().optional(),
  // For updates, we usually replace all questions
  questions: z.array(quizQuestionSchema).min(1).optional(),
});

export const submitQuizAttemptSchema = z.object({
  // Record<questionId, selectedAnswerText>
  answers: z.record(z.string(), z.string()),
});

export const quizListQuerySchema = z.object({
  courseId: z.string().min(1).optional(),
  batchId: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
export type UpdateQuizInput = z.infer<typeof updateQuizSchema>;
export type SubmitQuizAttemptInput = z.infer<typeof submitQuizAttemptSchema>;
export type QuizListQuery = z.infer<typeof quizListQuerySchema>;
