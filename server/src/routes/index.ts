import { Router } from 'express';
import type { AiProvider } from '../ai/provider';
import { createAuthRouter } from './auth';
import { createHealthRouter } from './health';
import { createLeadsRouter } from './leads';

export function createRoutes(ai: AiProvider): Router {
  const router = Router();
  router.use('/health', createHealthRouter(ai));
  router.use('/auth', createAuthRouter());
  router.use('/leads', createLeadsRouter());
  return router;
}
