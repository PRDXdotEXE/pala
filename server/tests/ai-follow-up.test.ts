import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';
import { stripSignature } from '../src/services/ai/ai.service';
import { AiTimeoutError, AiUnavailableError } from '../src/services/ai/provider';
import type {
  AiGenerateOptions,
  AiHealthStatus,
  AiProvider,
} from '../src/services/ai/provider';

class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  nextResponse = 'Hello Sita, following up on your restaurant website.';
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
const ownerEmail = `ai-followup-owner-${stamp}@test.dev`;
const strangerEmail = `ai-followup-stranger-${stamp}@test.dev`;

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) throw new Error('no set-cookie header');
  return first.split(';')[0];
}

const leadPayload = {
  clientName: 'Sita Gurung',
  company: 'ABC Restaurant',
  project: 'Restaurant Website',
  description: 'A modern website with online ordering.',
  budgetMin: 40000,
  budgetMax: 60000,
  currency: 'NPR',
  status: 'interested',
  priority: 'high',
  deadline: '2026-12-01',
};

describe('stripSignature (code-enforced no-signature rule)', () => {
  it('removes a trailing placeholder and sign-off', () => {
    const raw = "Hi Sita,\n\nLet's talk Monday.\n\nBest regards,\n[Freelancer's Name]";
    expect(stripSignature(raw)).toBe("Hi Sita,\n\nLet's talk Monday.");
  });

  it('keeps the message when there is no signature', () => {
    expect(stripSignature('Hi Sita, shall we start Monday?')).toBe(
      'Hi Sita, shall we start Monday?',
    );
  });

  it('does not strip mid-message thanks', () => {
    expect(stripSignature('Thanks for the details.\n\nShall we start Monday?')).toBe(
      'Thanks for the details.\n\nShall we start Monday?',
    );
  });
});

describe('POST /api/ai/follow-up', () => {
  let ownerCookie: string;
  let strangerCookie: string;
  let leadId: string;

  it('requires a session', async () => {
    const res = await request(app)
      .post('/api/ai/follow-up')
      .send({ leadId: '00000000-0000-4000-8000-000000000000' });
    expect(res.status).toBe(401);
  });

  it('registers the lead owner', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Owner',
      email: ownerEmail,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    ownerCookie = sessionCookie(res);
  });

  it('creates a lead for the owner', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Cookie', ownerCookie)
      .send(leadPayload);
    expect(res.status).toBe(201);
    leadId = res.body.lead.id;
  });

  it('rejects a missing leadId with 400', async () => {
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('rejects a non-uuid leadId with 400', async () => {
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({ leadId: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown lead', async () => {
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({ leadId: '00000000-0000-4000-8000-000000000000' });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Lead not found');
  });

  it('returns 404 for another user’s lead (scoping)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Stranger',
      email: strangerEmail,
      password: 'password123',
    });
    expect(res.status).toBe(201);
    strangerCookie = sessionCookie(res);

    const denied = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', strangerCookie)
      .send({ leadId });
    expect(denied.status).toBe(404);
    expect(denied.body.error).toBe('Lead not found');
  });

  it('generates a follow-up from the lead and messages', async () => {
    await request(app)
      .post(`/api/leads/${leadId}/messages`)
      .set('Cookie', ownerCookie)
      .send({ role: 'client', content: 'Can we start next week?' })
      .expect(201);

    ai.nextResponse = 'Hi Sita, thanks for waiting — yes, next week works.';
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({ leadId });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hi Sita, thanks for waiting — yes, next week works.');

    expect(ai.lastPrompt).toContain('Sita Gurung');
    expect(ai.lastPrompt).toContain('ABC Restaurant');
    expect(ai.lastPrompt).toContain('Client: Can we start next week?');
    expect(ai.lastPrompt).toContain('Budget: 40000 to 60000 NPR');
    expect(ai.lastOptions?.system).toContain('untrusted data');
    expect(ai.lastOptions?.temperature).toBe(0.7);
    expect(ai.lastOptions?.numPredict).toBe(400);
    expect(ai.lastOptions?.numCtx).toBe(4096);
    expect(ai.lastOptions?.format).toBeUndefined();
  });

  it('rejects empty AI output with 502', async () => {
    ai.nextResponse = '   ';
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({ leadId });
    ai.nextResponse = 'Hello Sita, following up on your restaurant website.';

    expect(res.status).toBe(502);
    expect(res.body.error).toContain('empty follow-up');
  });

  it('maps an unavailable provider to 503 with a friendly message', async () => {
    ai.nextError = new AiUnavailableError('Ollama unreachable', 'ECONNREFUSED');
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({ leadId });
    ai.nextError = null;

    expect(res.status).toBe(503);
    expect(res.body.error).toBe(
      'Local AI is currently unavailable. Check that Ollama is running and try again.',
    );
  });

  it('maps a provider timeout to 504', async () => {
    ai.nextError = new AiTimeoutError();
    const res = await request(app)
      .post('/api/ai/follow-up')
      .set('Cookie', ownerCookie)
      .send({ leadId });
    ai.nextError = null;

    expect(res.status).toBe(504);
    expect(res.body.error).toBe(
      'The local model took too long to respond. Please try again.',
    );
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, ownerEmail));
    await db.delete(users).where(eq(users.email, strangerEmail));
    await pool.end();
  });
});
