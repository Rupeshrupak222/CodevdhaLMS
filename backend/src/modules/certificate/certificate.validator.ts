import { z } from 'zod';

const certificateTypeEnum = z.enum(['COURSE_COMPLETION', 'INTERNSHIP_COMPLETION', 'PROJECT_COMPLETION', 'BEST_PERFORMANCE']);

// Single certificate generation (kept for backward compatibility)
export const generateCertificateSchema = z.object({
  studentId: z.string().min(1),
  courseId: z.string().min(1),
  type: z.union([
    certificateTypeEnum,
    z.array(certificateTypeEnum).min(1).max(4),
  ]),
  grade: z.string().min(1),
  startDate: z.string().datetime().optional(),
  completionDate: z.string().datetime(),
  durationMonths: z.string().optional(),
});

export const verifyCertificateSchema = z.object({
  verifyId: z.string().min(6),
});

export const certificateListQuerySchema = z.object({
  studentId: z.string().min(1).optional(),
  courseId: z.string().min(1).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

export type GenerateCertificateInput = z.infer<typeof generateCertificateSchema>;
export type VerifyCertificateInput = z.infer<typeof verifyCertificateSchema>;
export type CertificateListQuery = z.infer<typeof certificateListQuerySchema>;
