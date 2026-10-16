/**
 * AI evaluation harness: runs every case in eval-cases.ts against the REAL
 * local model (Ollama) and prints an Expected / Actual / Pass-Fail table.
 *
 *   npm run ai:eval -w server            # full run (warm ~2-4 min, cold slower)
 *   npm run ai:eval -w server -- --min=0.8
 *
 * Not part of `npm test` — it needs a live Ollama and is too slow/flaky for CI.
 */
import { createAiProvider } from '../src/services/ai/index';
import {
  draftFollowUp,
  draftProposal,
  analyzeConversation,
} from '../src/services/ai/ai.service';
import { evalCases, type EvalCase, type Expectation } from './eval-cases';

function matches(actual: unknown, expected: Expectation): boolean {
  if (expected !== null && typeof expected === 'object') {
    if ('contains' in expected) {
      if (actual == null) return false;
      return String(actual).toLowerCase().includes(expected.contains.toLowerCase());
    }
    if ('notContains' in expected) {
      if (actual == null) return true;
      return !String(actual).toLowerCase().includes(expected.notContains.toLowerCase());
    }
  }
  if (expected === null) return actual === null;
  return actual === expected;
}

function fmt(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (typeof value === 'string') return value.length > 60 ? `${value.slice(0, 57)}…` : value;
  return String(value);
}

function fmtExpectation(expected: Expectation): string {
  if (expected !== null && typeof expected === 'object') {
    if ('contains' in expected) return `contains "${expected.contains}"`;
    if ('notContains' in expected) return `!contains "${expected.notContains}"`;
  }
  if (expected === null) return 'null';
  return String(expected);
}

async function runCase(
  ai: ReturnType<typeof createAiProvider>,
  evalCase: EvalCase,
): Promise<{ pass: boolean; failures: string[]; sample: string }> {
  const failures: string[] = [];
  let sample = '';

  try {
    let result: Record<string, unknown>;
    if (evalCase.kind === 'extraction') {
      result = await analyzeConversation(ai, evalCase.conversation ?? '');
      sample = `${fmt(result.clientName)} / ${fmt(result.budgetMin)}-${fmt(result.budgetMax)} ${fmt(result.currency)} / ${fmt(result.deadline)} / status=${fmt(result.status)} / priority=${fmt(result.priority)}`;
    } else if (evalCase.kind === 'followUp') {
      const message = await draftFollowUp(ai, {
        lead: evalCase.lead as NonNullable<EvalCase['lead']> & {
          budgetMin: number | null;
          budgetMax: number | null;
          status: string | null;
        },
        messages: evalCase.messages ?? [],
      });
      result = { message };
      sample = message.replace(/\s+/g, ' ').slice(0, 90);
    } else {
      const proposal = await draftProposal(ai, {
        lead: evalCase.lead as NonNullable<EvalCase['lead']>,
        requirements: evalCase.requirements,
      });
      result = proposal;
      sample = `${proposal.title} | pricing: ${proposal.pricing.slice(0, 60)}`;
    }

    for (const [key, expected] of Object.entries(evalCase.expect)) {
      if (!matches(result[key], expected)) {
        failures.push(`${key}: expected ${fmtExpectation(expected)}, got ${fmt(result[key])}`);
      }
    }
  } catch (err) {
    failures.push(`error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { pass: failures.length === 0, failures, sample };
}

function parseMin(): number {
  const arg = process.argv.find((a) => a.startsWith('--min='));
  if (arg) {
    const value = Number(arg.slice('--min='.length));
    if (Number.isFinite(value) && value > 0 && value <= 1) return value;
  }
  return 0.75;
}

/** `--only=injection` runs just the cases whose name contains the substring. */
function filterCases(): EvalCase[] {
  const arg = process.argv.find((a) => a.startsWith('--only='));
  if (!arg) return evalCases;
  const needle = arg.slice('--only='.length).toLowerCase();
  return evalCases.filter((c) => c.name.toLowerCase().includes(needle));
}

async function main(): Promise<void> {
  const ai = createAiProvider();
  const health = await ai.health();
  if (!health.ok) {
    console.error(`AI provider not ready: ${health.detail ?? 'unhealthy'}`);
    process.exit(1);
  }

  const cases = filterCases();
  console.log(`AI eval — provider=${ai.name} model=${health.model} cases=${cases.length}\n`);

  const nameWidth = Math.max(...cases.map((c) => c.name.length), 10);
  let passed = 0;
  const started = Date.now();

  for (const [index, evalCase] of cases.entries()) {
    const caseStart = Date.now();
    const { pass, failures, sample } = await runCase(ai, evalCase);
    const ms = ((Date.now() - caseStart) / 1000).toFixed(1);
    if (pass) passed += 1;

    const mark = pass ? 'PASS' : 'FAIL';
    console.log(
      `${String(index + 1).padStart(2, ' ')}. [${mark}] ${evalCase.name.padEnd(nameWidth)} (${ms}s)`,
    );
    console.log(`     actual: ${sample}`);
    for (const failure of failures) {
      console.log(`     ✗ ${failure}`);
    }
    if (!pass && evalCase.name.toLowerCase().includes('injection')) {
      console.log(
        '     note: known limit of the 1.5B model — the server also flags this conversation with a UI warning (services/ai/injection.ts) before anything is saved.',
      );
    }
  }

  const rate = passed / cases.length;
  const min = parseMin();
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(
    `\nResult: ${passed}/${cases.length} passed (${(rate * 100).toFixed(0)}%) in ${seconds}s — threshold ${(min * 100).toFixed(0)}%`,
  );
  process.exit(rate >= min ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
