import type { Response } from 'express';
import type { AuthUser } from '../middleware/auth';

export const SESSION_COOKIE = 'plas_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_MS,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export type SessionUser = AuthUser;
