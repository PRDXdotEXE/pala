import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Explicit allow-list CORS, only active when CORS_ORIGIN is configured.
 * Same-origin setups (Vite proxy) need no CORS headers at all.
 */
export function cors(origin: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestOrigin = req.headers.origin;
    if (requestOrigin === origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}
