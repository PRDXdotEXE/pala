import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addMessageSchema } from '../schemas/conversation.schema';

export function createConversationsRouter(): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/:id/messages', conversationController.listMessages);
  router.post(
    '/:id/messages',
    validate(addMessageSchema),
    conversationController.addMessage,
  );
  return router;
}
