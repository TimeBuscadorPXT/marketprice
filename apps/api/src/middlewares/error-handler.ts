import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: err.message,
      code: err.code,
    };

    if ('details' in err && (err as { details?: Record<string, string[]> }).details) {
      response.details = (err as { details: Record<string, string[]> }).details;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  console.error('[UnhandledError]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
  });
}
