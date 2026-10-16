import { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http-error';

interface ErrorLike {
  type?: string;
  status?: number;
  statusCode?: number;
  message?: string;
  code?: string | number;
}

/** Postgres / pool connection failures (SQLSTATE class 08, 57 + common Node codes). */
function isDbError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as ErrorLike;
  const code = typeof e.code === 'string' ? e.code : '';
  if (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ETIMEDOUT'
  ) {
    return true;
  }
  if (code.startsWith('08') || code.startsWith('57') || code === '53300') return true;
  const message = typeof e.message === 'string' ? e.message : '';
  return (
    message.includes('Connection terminated') ||
    message.includes('timeout exceeded when trying to connect')
  );
}

/**
 * One place every error funnels through. HttpError keeps its own message;
 * anything else is translated into something safe and human:
 * body-parser types get precise 4xx, DB failures get a friendly 503,
 * and unexpected 5xx never leak internals ("Internal server error").
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode: number;
  let message: string;

  if (err instanceof HttpError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    const e: ErrorLike = typeof err === 'object' && err !== null ? (err as ErrorLike) : {};
    if (e.type === 'entity.too.large') {
      statusCode = 413;
      message = 'Request body is too large.';
    } else if (e.type === 'entity.parse.failed') {
      statusCode = 400;
      message = 'Invalid JSON body.';
    } else if (isDbError(err)) {
      statusCode = 503;
      message = 'Database unavailable. Please try again shortly.';
    } else {
      const raw = Number(e.statusCode ?? e.status);
      if (Number.isFinite(raw) && raw >= 400 && raw < 500) {
        statusCode = raw;
        message = e.message || 'Bad request';
      } else {
        statusCode = 500;
        message = 'Internal server error';
      }
    }
  }

  if (!Number.isFinite(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }
  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}
