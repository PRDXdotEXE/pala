import { z } from 'zod';

export const addMessageSchema = z.object({
  role: z.enum(['client', 'user', 'assistant']),
  content: z.string().trim().min(1).max(10_000),
});

export type AddMessageInput = z.infer<typeof addMessageSchema>;
