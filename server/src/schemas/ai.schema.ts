import { z } from 'zod';

export const analyzeConversationSchema = z.object({
  conversation: z.string().trim().min(1).max(20_000),
});

export const followUpSchema = z.object({
  leadId: z.uuid(),
});

export const proposalRequestSchema = z.object({
  leadId: z.uuid(),
  requirements: z.string().trim().min(1).max(4000).optional(),
});

export type AnalyzeConversationInput = z.infer<typeof analyzeConversationSchema>;
export type FollowUpInput = z.infer<typeof followUpSchema>;
export type ProposalRequestInput = z.infer<typeof proposalRequestSchema>;
