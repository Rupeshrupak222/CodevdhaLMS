// Custom API Error class

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errors?: Array<{ field?: string; message: string }>) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message: string = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static forbidden(message: string = 'Forbidden') {
    return new AppError(message, 403);
  }

  static notFound(message: string = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message: string) {
    return new AppError(message, 409);
  }

  static tooManyRequests(message: string = 'Too many requests, please try again later') {
    return new AppError(message, 429);
  }

  static unprocessable(message: string, errors?: Array<{ field?: string; message: string }>) {
    return new AppError(message, 422, errors);
  }

  static internal(message: string = 'Internal server error') {
    return new AppError(message, 500);
  }
}
