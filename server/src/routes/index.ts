import { Router } from 'express';
import { env } from '../config/env';
import { rateLimit } from '../middleware/rate-limit';
import type { AiProvider } from '../services/ai/provider';
import { createAiRouter } from './ai';
import { createAuthRouter } from './auth';
import { createConversationsRouter } from './conversations';
import { createHealthRouter } from './health';
import { createLeadsRouter } from './leads';

export function createRoutes(ai: AiProvider): Router {
  const router = Router();

  // Generous global budget so normal browsing never trips; strict budgets on
  // auth (brute force) and ai (Ollama inference). Disabled under NODE_ENV=test
  // so test suites can make many requests; the middleware itself is unit-tested.
  const enabled = env.NODE_ENV !== 'test';
  const globalLimiter = rateLimit({ windowMs: 60_000, max: 300, enabled });
  const authLimiter = rateLimit({ windowMs: 60_000, max: 20, enabled });
  const aiLimiter = rateLimit({ windowMs: 60_000, max: 12, enabled });

  router.use(globalLimiter);
  router.use('/health', createHealthRouter(ai));
  router.use('/auth', authLimiter, createAuthRouter());
  router.use('/leads', createLeadsRouter());
  router.use('/conversations', createConversationsRouter());
  router.use('/ai', aiLimiter, createAiRouter(ai));
  return router;
}
