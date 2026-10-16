import { z } from 'zod';

export const proposalSchema = z.object({
  title: z.string().min(1).max(200),
  projectOverview: z.string().min(1).max(2000),
  scope: z.array(z.string().min(1).max(500)).min(1).max(12),
  deliverables: z.array(z.string().min(1).max(500)).min(1).max(15),
  timeline: z.array(z.string().min(1).max(300)).min(1).max(12),
  pricing: z.string().min(1).max(2000),
  nextSteps: z.string().min(1).max(1000),
});

export const proposalJsonSchema = z.toJSONSchema(proposalSchema, { io: 'input' });

export type Proposal = z.infer<typeof proposalSchema>;
