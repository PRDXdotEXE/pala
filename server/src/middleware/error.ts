import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = typeof err === 'object' && err !== null && 'statusCode' in err
    ? Number((err as { statusCode: unknown }).statusCode)
    : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500).json({
    error: message,
  });
}
