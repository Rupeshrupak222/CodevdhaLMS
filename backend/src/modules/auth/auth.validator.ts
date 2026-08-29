import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  forceLogin: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(100),
});

// ── Face Auth Validation Schemas ─────────────────────────────────────────────
// Face embeddings from face-api.js are 128-dimensional float arrays
const embeddingSchema = z
  .array(z.number().min(-10).max(10))
  .min(64, 'Embedding must have at least 64 dimensions')
  .max(512, 'Embedding must have at most 512 dimensions');

export const faceEnrollSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  embedding: embeddingSchema,
  imageBase64: z
    .string()
    .max(5 * 1024 * 1024, 'Image must be less than 5MB') // ~5MB base64
    .optional(),
});

export const faceVerifySchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  embedding: embeddingSchema,
});

// ── Signup Schema (for mobile app self-registration) ─────────────────────────
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type FaceEnrollInput = z.infer<typeof faceEnrollSchema>;
export type FaceVerifyInput = z.infer<typeof faceVerifySchema>;
