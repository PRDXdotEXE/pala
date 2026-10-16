import { z } from 'zod';

export const leadStatusValues = [
  'new',
  'contacted',
  'interested',
  'proposal_sent',
  'negotiating',
  'converted',
  'lost',
] as const;

export const priorityValues = ['low', 'medium', 'high'] as const;

/**
 * The contract for what the model may return. Every field is nullable because
 * the model must report `null` for anything the conversation does not state —
 * never a guess.
 *
 * Rules the model cannot see in JSON Schema (descriptions, enum membership
 * spelled out in words) live in `prompts/lead-extraction.ts`; Zod is the final
 * gate, not the only one.
 */
export const leadExtractionSchema = z.object({
  clientName: z
    .string()
    .min(1)
    .nullable()
    .describe('Name of the client person as stated, otherwise null'),
  company: z
    .string()
    .min(1)
    .nullable()
    .describe('Company name as stated, otherwise null'),
  project: z
    .string()
    .min(1)
    .nullable()
    .describe('Short title of what they want built, otherwise null'),
  description: z
    .string()
    .nullable()
    .describe("Factual summary of the request in the client's own words, otherwise null"),
  budgetMin: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe('Lower budget bound as a plain number without symbols, otherwise null'),
  budgetMax: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe('Upper budget bound as a plain number without symbols, otherwise null'),
  currency: z
    .string()
    .length(3)
    .nullable()
    .describe('ISO 4217 code (USD, EUR, NPR) only if stated, otherwise null'),
  deadline: z
    .string()
    .min(1)
    .nullable()
    .describe('Deadline exactly as stated in the conversation, otherwise null'),
  status: z
    .enum(leadStatusValues)
    .nullable()
    .describe(
      'One of new, contacted, interested, proposal_sent, negotiating, converted, lost — only if the conversation shows that stage, otherwise null',
    ),
  priority: z
    .enum(priorityValues)
    .nullable()
    .describe('One of low, medium, high — only if urgency or budget makes it clear, otherwise null'),
  nextAction: z
    .string()
    .min(1)
    .nullable()
    .describe('Next step clearly implied by the conversation, otherwise null'),
});

/** JSON Schema handed to the provider for constrained decoding. */
export const leadExtractionJsonSchema: Record<string, unknown> = z.toJSONSchema(
  leadExtractionSchema,
  { io: 'input' },
) as Record<string, unknown>;

export type LeadExtraction = z.infer<typeof leadExtractionSchema>;
