/**
 * Deterministic prompt-injection detection on pasted conversations.
 *
 * The local 1.5B model cannot reliably resist direct injections (measured in
 * scripts/ai-eval.ts), so protection is layered:
 *   1. system prompts tell the model to treat content as untrusted data,
 *   2. this detector flags instruction-shaped text BEFORE it reaches the model,
 *   3. the review UI shows a warning, and a human approves every extracted lead.
 * Nothing here blocks or rewrites user data — it only powers the warning.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|earlier|above|preceding)\s+instructions?/i,
  /disregard\s+(?:all\s+|any\s+)?(?:previous|prior|earlier|above)\s+instructions?/i,
  /\[system\]/i,
  /<\s*system\s*>/i,
  /you\s+must\s+(?:always\s+)?output/i,
  /from\s+now\s+on\s+(?:you\s+must|always)/i,
  /pretend\s+(?:to\s+be|you\s+are)\s+(?:an?\s+)?(?:system|developer|assistant)/i,
];

export const PROMPT_INJECTION_WARNING =
  'This conversation contains instruction-like text. The model may have followed it instead of the client — review every extracted value carefully.';

export function detectPromptInjection(text: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) return PROMPT_INJECTION_WARNING;
  }
  return null;
}
