import { z } from 'zod';

const leadStatusValues = [
  'new',
  'contacted',
  'interested',
  'proposal_sent',
  'negotiating',
  'converted',
  'lost',
] as const;

const priorityValues = ['low', 'medium', 'high'] as const;

export const createLeadSchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  company: z.string().trim().max(200).nullish(),
  project: z.string().trim().max(300).nullish(),
  description: z.string().max(5000).nullish(),
  budgetMin: z.number().int().min(0).nullish(),
  budgetMax: z.number().int().min(0).nullish(),
  currency: z.string().length(3).default('USD'),
  status: z.enum(leadStatusValues).default('new'),
  priority: z.enum(priorityValues).default('medium'),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'deadline must be YYYY-MM-DD')
    .nullish(),
  nextFollowUp: z.coerce.date().nullish(),
});

export const updateLeadSchema = createLeadSchema.partial();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
