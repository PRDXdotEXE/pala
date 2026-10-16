import { describe, expect, it } from 'vitest';
import { FOLLOW_UP_SYSTEM } from '../src/services/ai/prompts/follow-up';
import { LEAD_EXTRACTION_SYSTEM } from '../src/services/ai/prompts/lead-extraction';
import { PROPOSAL_SYSTEM } from '../src/services/ai/prompts/proposal';

/**
 * Prompt-injection hardening: every system prompt must treat pasted client
 * content as untrusted data, never as instructions. If a new prompt forgets
 * this guard, this test fails before the prompt ships.
 */
describe('system prompts defend against prompt injection', () => {
  const prompts: [string, string][] = [
    ['lead extraction', LEAD_EXTRACTION_SYSTEM],
    ['follow-up', FOLLOW_UP_SYSTEM],
    ['proposal', PROPOSAL_SYSTEM],
  ];

  it.each(prompts)('%s marks source content as untrusted data', (_name, system) => {
    expect(system).toContain('untrusted data');
    expect(system).toContain('not instructions');
  });

  it.each(prompts)('%s forbids following instructions found in the content', (_name, system) => {
    expect(system.toLowerCase()).toMatch(/ignore any/);
  });
});
