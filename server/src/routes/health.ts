import { Router } from 'express';
import type { AiProvider } from '../ai/provider';
import { createHealthController } from '../controllers/health.controller';

export function createHealthRouter(ai: AiProvider): Router {
  const router = Router();
  router.get('/', createHealthController(ai));
  return router;
}
