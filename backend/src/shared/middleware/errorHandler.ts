// ── errorHandler.ts ───────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
    });
  }

  // Prisma errors
  if ((err as any).code === 'P2002') {
    const field = (err as any).meta?.target?.[0];
    return res.status(409).json({
      message: `${field ? `'${field}'` : 'Value'} already exists`,
      code: 'DUPLICATE',
    });
  }

  if ((err as any).code === 'P2025') {
    return res.status(404).json({ message: 'Record not found', code: 'NOT_FOUND' });
  }

  logger.error('Unhandled error:', err);
  return res.status(500).json({ message: 'Internal server error' });
}
