import { Response } from 'express';

interface SuccessOptions {
  message?: string;
  data?: any;
  meta?: Record<string, any>;
  statusCode?: number;
}

interface PaginationOptions {
  page: number;
  limit: number;
  total: number;
}

export const sendSuccess = (
  res: Response,
  { message = 'Success', data = null, meta, statusCode = 200 }: SuccessOptions
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta && { meta }),
  });
};

export const sendCreated = (
  res: Response,
  { message = 'Created successfully', data = null }: SuccessOptions
) => {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
};

export const buildPaginationMeta = (
  { page, limit, total }: PaginationOptions
) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

export const parsePaginationParams = (query: any) => {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(query.limit as string) || 100));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

