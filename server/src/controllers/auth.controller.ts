import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { clearSessionCookie, setSessionCookie } from '../utils/auth-cookie';

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.register(req.body);
    setSessionCookie(res, authService.createSessionToken(user));
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.login(req.body);
    setSessionCookie(res, authService.createSessionToken(user));
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function logout(_req: Request, res: Response): void {
  clearSessionCookie(res);
  res.json({ ok: true });
}

export function me(req: Request, res: Response): void {
  res.json({ user: req.user });
}
