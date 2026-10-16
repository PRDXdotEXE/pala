import type { NextFunction, Request, Response } from 'express';
import type { AiProvider } from '../ai/provider';
import { getHealthStatus } from '../services/health.service';

export function createHealthController(ai: AiProvider) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await getHealthStatus(ai);
      res.json(status);
    } catch (err) {
      next(err);
    }
  };
}
