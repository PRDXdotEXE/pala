import { Router } from 'express';
import * as conversationController from '../controllers/conversation.controller';
import * as leadsController from '../controllers/leads.controller';
import * as proposalController from '../controllers/proposal.controller';
import { requireAuth } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validate';
import {
  addMessageSchema,
  createConversationSchema,
} from '../schemas/conversation.schema';
import { createLeadSchema, listLeadsQuerySchema, updateLeadSchema } from '../schemas/lead.schema';
import { saveProposalSchema } from '../schemas/proposal.schema';

export function createLeadsRouter(): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', validateQuery(listLeadsQuerySchema), leadsController.list);
  router.post('/', validate(createLeadSchema), leadsController.create);
  router.get('/:id/conversations', conversationController.list);
  router.post(
    '/:id/conversations',
    validate(createConversationSchema),
    conversationController.create,
  );
  router.post('/:id/messages', validate(addMessageSchema), conversationController.add);
  router.get('/:id/proposals', proposalController.list);
  router.post('/:id/proposals', validate(saveProposalSchema), proposalController.save);
  router.delete('/:id/proposals/:proposalId', proposalController.remove);
  router.get('/:id', leadsController.get);
  router.patch('/:id', validate(updateLeadSchema), leadsController.update);
  router.delete('/:id', leadsController.remove);
  return router;
}
