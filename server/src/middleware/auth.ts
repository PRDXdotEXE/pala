import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';
import { SESSION_COOKIE } from '../utils/auth-cookie';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new Error('bad payload');
    }
    req.user = {
      id: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
    };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired session'));
  }
};
