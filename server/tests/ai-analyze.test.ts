import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';
import { HttpError } from '../src/utils/http-error';
import { parseLeadExtraction } from '../src/services/ai/ai.service';
import { AiTimeoutError } from '../src/services/ai/provider';
import type {
  AiGenerateOptions,
  AiHealthStatus,
  AiProvider,
} from '../src/services/ai/provider';

class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  nextResponse = '{}';
  nextError: Error | null = null;
  lastPrompt = '';
  lastOptions: AiGenerateOptions | undefined;

  async health(): Promise<AiHealthStatus> {
    return { ok: true, model: 'mock-model' };
  }

  async generate(prompt: string, options?: AiGenerateOptions): Promise<string> {
    this.lastPrompt = prompt;
    this.lastOptions = options;
    if (this.nextError) throw this.nextError;
    return this.nextResponse;
  }
}

const ai = new MockAiProvider();
const app = createApp(ai);
const stamp = Date.now();
const email = `ai-analyze-${stamp}@test.dev`;

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) throw new Error('no set-cookie header');
  return first.split(';')[0];
}

const fullExtraction = {
  clientName: 'Sita Gurung',
  company: 'ABC Restaurant',
  project: 'Restaurant Website',
  description: 'A modern website with online ordering.',
  budgetMin: 40000,
  budgetMax: 60000,
  currency: 'NPR',
  deadline: 'Dashain',
  status: 'interested',
  priority: 'high',
  nextAction: 'Send a proposal',
};

const emptyExtraction = {
  clientName: null,
  company: null,
  project: null,
  description: null,
  budgetMin: null,
  budgetMax: null,
  currency: null,
  deadline: null,
  status: null,
  priority: null,
  nextAction: null,
};

describe('POST /api/ai/analyze', () => {
  let cookie: string;

  it('requires a session', async () => {
    const res = await request(app)
      .post('/api/ai/analyze')
      .send({ conversation: 'I need a website.' });
    expect(res.status).toBe(401);
  });

  it('registers a user and keeps the session cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'AI User',
      email,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    cookie = sessionCookie(res);
  });

  it('rejects an empty or missing conversation with 400', async () => {
    const empty = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error).toBe('Validation failed');

    const missing = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({});
    expect(missing.status).toBe(400);
  });

  it('rejects an oversized conversation with 400', async () => {
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'x'.repeat(20_001) });
    expect(res.status).toBe(400);
  });

  it('returns the extracted lead and sends a constrained generation request', async () => {
    ai.nextResponse = JSON.stringify(fullExtraction);
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({
        conversation:
          'Hi, I run ABC Restaurant. I need a website. Budget 40000 to 60000 NPR, ready by Dashain.',
      });

    expect(res.status).toBe(200);
    expect(res.body.lead).toEqual(fullExtraction);

    expect(ai.lastPrompt).toContain('ABC Restaurant');
    expect(ai.lastPrompt).toContain('<conversation>');
    expect(ai.lastOptions?.system).toContain('return null');
    expect(ai.lastOptions?.temperature).toBe(0);
    expect(ai.lastOptions?.seed).toBe(42);
    expect(ai.lastOptions?.numCtx).toBe(8192);
    expect(typeof ai.lastOptions?.format).toBe('object');
    const schema = ai.lastOptions?.format as { required?: string[] };
    expect(schema.required).toEqual(Object.keys(fullExtraction));
  });

  it('does not invent values the model left out', async () => {
    ai.nextResponse = JSON.stringify(emptyExtraction);
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'I need a website.' });

    expect(res.status).toBe(200);
    expect(res.body.lead).toEqual(emptyExtraction);
    expect(res.body.lead.budgetMin).toBeNull();
    expect(res.body.lead.deadline).toBeNull();
  });

  it('rejects invalid JSON with a useful 502', async () => {
    ai.nextResponse = 'Sorry, here is what I found: not json';
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'Anything.' });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('invalid JSON');
    expect(res.body.error).toContain('not json');
  });

  it('rejects model output that fails schema validation with a useful 502', async () => {
    ai.nextResponse = JSON.stringify({
      ...fullExtraction,
      budgetMin: '40000',
      status: 'banana',
    });
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'Anything.' });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('failed validation');
    expect(res.body.error).toContain('budgetMin');
    expect(res.body.error).toContain('status');
  });

  it('maps a provider failure to 503 with a friendly message', async () => {
    ai.nextError = new Error('ECONNREFUSED http://localhost:11434');
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'Anything.' });
    ai.nextError = null;

    expect(res.status).toBe(503);
    expect(res.body.error).toBe(
      'Local AI is currently unavailable. Check that Ollama is running and try again.',
    );
    expect(res.body.error).not.toContain('ECONNREFUSED');
  });

  it('maps a provider timeout to 504 with a friendly message', async () => {
    ai.nextError = new AiTimeoutError('Ollama generate timed out after 120s');
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'Anything.' });
    ai.nextError = null;

    expect(res.status).toBe(504);
    expect(res.body.error).toBe(
      'The local model took too long to respond. Please try again.',
    );
  });

  it('strips unknown keys instead of passing model extras through', async () => {
    ai.nextResponse = JSON.stringify({
      ...fullExtraction,
      hallucinatedField: 'nope',
    });
    const res = await request(app)
      .post('/api/ai/analyze')
      .set('Cookie', cookie)
      .send({ conversation: 'Anything.' });

    expect(res.status).toBe(200);
    expect(res.body.lead).toEqual(fullExtraction);
    expect(res.body.lead).not.toHaveProperty('hallucinatedField');
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    await pool.end();
  });
});

describe('parseLeadExtraction (LLM -> JSON -> Zod)', () => {
  it('accepts valid JSON and keeps explicit nulls', () => {
    expect(parseLeadExtraction(JSON.stringify(emptyExtraction))).toEqual(emptyExtraction);
  });

  it('accepts JSON wrapped in markdown fences', () => {
    const raw = '```json\n' + JSON.stringify(emptyExtraction) + '\n```';
    expect(parseLeadExtraction(raw)).toEqual(emptyExtraction);
  });

  it('throws HttpError 502 on non-JSON input', () => {
    expect(() => parseLeadExtraction('{"broken"')).toThrowError(HttpError);
    try {
      parseLeadExtraction('{"broken"');
    } catch (err) {
      expect((err as HttpError).statusCode).toBe(502);
    }
  });

  it('throws HttpError 502 listing the failing fields', () => {
    try {
      parseLeadExtraction(JSON.stringify({ ...emptyExtraction, currency: 'Dollars' }));
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).statusCode).toBe(502);
      expect((err as HttpError).message).toContain('currency');
    }
  });
});
