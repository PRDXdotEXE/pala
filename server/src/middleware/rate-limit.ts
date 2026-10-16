import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../utils/http-error';

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests per key per window. */
  max: number;
  /** Turn the limiter off entirely (tests wire `enabled: env.NODE_ENV !== 'test'`). */
  enabled?: boolean;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * In-memory fixed-window limiter. Per-process by design: this app runs as a
 * single Node process, so no shared store is needed. Requests are keyed by IP
 * within each limiter instance (global / auth / ai each have their own map).
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  if (options.enabled === false) {
    return (_req: Request, _res: Response, next: NextFunction): void => next();
  }

  const buckets = new Map<string, Bucket>();
  const sweep = setInterval(
    () => {
      const now = Date.now();
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
    },
    Math.max(options.windowMs, 1000),
  );
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(options.max));
    res.setHeader(
      'X-RateLimit-Remaining',
      String(Math.max(0, options.max - bucket.count)),
    );

    if (bucket.count > options.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      next(
        new HttpError(
          429,
          'Too many requests. Please wait a moment and try again.',
          `rate limit exceeded (${bucket.count}/${options.max})`,
        ),
      );
      return;
    }
    next();
  };
}
