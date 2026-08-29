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
      console.error('[VALIDATION FAILED]', target, errors);
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
