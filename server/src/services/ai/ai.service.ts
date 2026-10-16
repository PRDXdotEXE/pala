import { HttpError } from '../../utils/http-error';
import {
  AiTimeoutError,
  AiUnavailableError,
  type AiGenerateOptions,
  type AiProvider,
} from './provider';
import {
  buildLeadExtractionPrompt,
  LEAD_EXTRACTION_SYSTEM,
} from './prompts/lead-extraction';
import { buildFollowUpPrompt, FOLLOW_UP_SYSTEM } from './prompts/follow-up';
import { buildProposalPrompt, PROPOSAL_SYSTEM } from './prompts/proposal';
import {
  leadExtractionJsonSchema,
  leadExtractionSchema,
  type LeadExtraction,
} from './schemas/lead-extraction';
import {
  proposalJsonSchema,
  proposalSchema,
  type Proposal,
} from './schemas/proposal';

/** Deterministic extraction: temperature 0 + fixed seed + explicit context budget. */
export const EXTRACTION_OPTIONS = {
  temperature: 0,
  seed: 42,
  numCtx: 8192,
  numPredict: 512,
} as const;

/** Follow-ups should vary between regenerations, so temperature is above 0. */
export const FOLLOW_UP_OPTIONS = {
  temperature: 0.7,
  numCtx: 4096,
  numPredict: 400,
} as const;

/** Proposals are structured and reviewable: deterministic like extraction, more output tokens. */
export const PROPOSAL_OPTIONS = {
  temperature: 0,
  seed: 42,
  numCtx: 8192,
  numPredict: 1400,
} as const;

export const AI_UNAVAILABLE_MESSAGE =
  'Local AI is currently unavailable. Check that Ollama is running and try again.';
export const AI_TIMEOUT_MESSAGE =
  'The local model took too long to respond. Please try again.';

/**
 * Single choke point for provider calls: maps provider-level failures to
 * friendly HttpErrors (503 down, 504 timeout) instead of leaking internals.
 */
async function callAi(
  ai: AiProvider,
  prompt: string,
  options: AiGenerateOptions,
): Promise<string> {
  try {
    return await ai.generate(prompt, options);
  } catch (err) {
    throw toAiHttpError(err);
  }
}

export function toAiHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  const detail = err instanceof Error ? err.message : String(err);
  if (err instanceof AiTimeoutError) {
    return new HttpError(504, AI_TIMEOUT_MESSAGE, detail);
  }
  if (err instanceof AiUnavailableError) {
    return new HttpError(503, AI_UNAVAILABLE_MESSAGE, detail);
  }
  return new HttpError(503, AI_UNAVAILABLE_MESSAGE, detail);
}

export async function analyzeConversation(
  ai: AiProvider,
  conversation: string,
): Promise<LeadExtraction> {
  const raw = await callAi(ai, buildLeadExtractionPrompt(conversation), {
    system: LEAD_EXTRACTION_SYSTEM,
    format: leadExtractionJsonSchema,
    ...EXTRACTION_OPTIONS,
  });
  return parseLeadExtraction(raw);
}

export async function draftFollowUp(
  ai: AiProvider,
  source: Parameters<typeof buildFollowUpPrompt>[0],
): Promise<string> {
  const raw = await callAi(ai, buildFollowUpPrompt(source), {
    system: FOLLOW_UP_SYSTEM,
    ...FOLLOW_UP_OPTIONS,
  });
  const message = stripSignature(raw.trim());
  if (!message) {
    throw new HttpError(502, 'AI returned an empty follow-up message.', 'empty output');
  }
  return message;
}

/**
 * The 1.5B model often adds a signature block despite the prompt
 * ("Best regards,\n[Freelancer's Name]"). Enforce the no-signature rule in code:
 * drop up to 3 trailing sign-off / placeholder lines.
 */
const SIGN_OFF_LINE =
  /^(best( regards)?|kind regards|regards|sincerely( yours)?|yours( truly| sincerely)?|cheers|thanks|thank you)[.,!?]?$/i;
const PLACEHOLDER_LINE = /^\[[^\]]*\]$/;

export function stripSignature(text: string): string {
  let out = text.trimEnd();
  for (let i = 0; i < 3 && out.length > 0; i++) {
    const newline = out.lastIndexOf('\n');
    const lastLine = (newline === -1 ? out : out.slice(newline + 1)).trim();
    if (!SIGN_OFF_LINE.test(lastLine) && !PLACEHOLDER_LINE.test(lastLine)) break;
    out = (newline === -1 ? '' : out.slice(0, newline)).trimEnd();
  }
  return out.trim();
}

export async function draftProposal(
  ai: AiProvider,
  source: Parameters<typeof buildProposalPrompt>[0],
): Promise<Proposal> {
  const raw = await callAi(ai, buildProposalPrompt(source), {
    system: PROPOSAL_SYSTEM,
    format: proposalJsonSchema,
    ...PROPOSAL_OPTIONS,
  });
  return parseProposal(raw);
}

/** LLM -> JSON -> Zod. Rejects with a useful 502 instead of trusting the model. */
export function parseProposal(raw: string): Proposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new HttpError(502, `AI returned invalid JSON: ${preview(raw)}`);
  }

  const result = proposalSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new HttpError(502, `AI returned data that failed validation: ${details}`);
  }
  return result.data;
}

/** LLM -> JSON -> Zod. Rejects with a useful 502 instead of trusting the model. */
export function parseLeadExtraction(raw: string): LeadExtraction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new HttpError(502, `AI returned invalid JSON: ${preview(raw)}`);
  }

  const result = leadExtractionSchema.safeParse(parsed);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new HttpError(502, `AI returned data that failed validation: ${details}`);
  }
  return result.data;
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start !== -1 && end > start) return candidate.slice(start, end + 1);
  return candidate.trim();
}

function preview(raw: string): string {
  return raw.trim().slice(0, 200);
}
