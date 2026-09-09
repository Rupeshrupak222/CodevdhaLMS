import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/apiError';

type ValidateTarget = 'body' | 'params' | 'query';

export const validate = (schema: ZodSchema, target: ValidateTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      // Only log validation details in development. In production this can leak
      // which fields a client is submitting (incl. auth/password endpoints) into
      // shared log streams; the structured errors are still returned to the client.
      if (process.env.NODE_ENV !== 'production') {
        console.error('[VALIDATION FAILED]', target, errors);
      }
      return next(AppError.unprocessable('Validation failed', errors));
    }

    // Replace target with parsed (sanitized, coerced) data
    Object.defineProperty(req, target, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true
    });
    next();
  };
};
