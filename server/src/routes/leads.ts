import { Router } from 'express';
import * as leadsController from '../controllers/leads.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLeadSchema, updateLeadSchema } from '../schemas/lead.schema';

export function createLeadsRouter(): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', leadsController.list);
  router.post('/', validate(createLeadSchema), leadsController.create);
  router.get('/:id', leadsController.get);
  router.patch('/:id', validate(updateLeadSchema), leadsController.update);
  router.delete('/:id', leadsController.remove);
  return router;
}
