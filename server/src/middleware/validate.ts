import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

function fail(res: Response, error: { issues: { path: PropertyKey[]; message: string }[] }): void {
  res.status(400).json({
    error: 'Validation failed',
    details: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

export function validate(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      fail(res, result.error);
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validate req.query. Express 5 exposes `query` as a prototype getter, so the
 * validated value shadows it on the request instance instead of assigning.
 */
export function validateQuery(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      fail(res, result.error);
      return;
    }
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    next();
  };
}
