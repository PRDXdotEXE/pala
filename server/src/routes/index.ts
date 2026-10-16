import { Router } from 'express';
import type { AiProvider } from '../ai/provider';
import { createHealthRouter } from './health';

export function createRoutes(ai: AiProvider): Router {
  const router = Router();
  router.use('/health', createHealthRouter(ai));
  return router;
}
