import { Router } from 'express';
import { createAiController } from '../controllers/ai.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { analyzeConversationSchema, followUpSchema, proposalRequestSchema } from '../schemas/ai.schema';
import type { AiProvider } from '../services/ai/provider';

export function createAiRouter(ai: AiProvider): Router {
  const router = Router();
  const controller = createAiController(ai);
  router.use(requireAuth);
  router.post('/analyze', validate(analyzeConversationSchema), controller.analyze);
  router.post('/follow-up', validate(followUpSchema), controller.followUp);
  router.post('/proposal', validate(proposalRequestSchema), controller.proposal);
  return router;
}
