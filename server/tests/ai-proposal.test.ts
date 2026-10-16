import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';
import type {
  AiGenerateOptions,
  AiHealthStatus,
  AiProvider,
} from '../src/services/ai/provider';

class MockAiProvider implements AiProvider {
  readonly name = 'mock';
  nextResponse = '';
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
const email = `ai-proposal-${stamp}@test.dev`;

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) throw new Error('no set-cookie header');
  return first.split(';')[0];
}

const validProposal = {
  title: 'Restaurant Website for ABC Restaurant',
  projectOverview: 'A modern website with online ordering for ABC Restaurant.',
  scope: ['Responsive website design', 'Online ordering flow', 'Content entry'],
  deliverables: ['Deployed website', 'Source code', 'Admin guide'],
  timeline: ['Week 1: Design', 'Week 2-3: Build', 'Week 4: Launch'],
  pricing: 'Within the stated budget of 40000 to 60000 NPR.',
  nextSteps: 'Confirm the scope to book a start date.',
};

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

describe('POST /api/ai/proposal', () => {
  let cookie: string;
  let leadId: string;
  let savedProposalId: string;

  it('requires a session', async () => {
    const res = await request(app)
      .post('/api/ai/proposal')
      .send({ leadId: '00000000-0000-4000-8000-000000000000' });
    expect(res.status).toBe(401);
  });

  it('registers a user and creates a lead', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Proposal User',
      email,
      password: 'password123',
    });
    expect(reg.status).toBe(201);
    cookie = sessionCookie(reg);

    const created = await request(app)
      .post('/api/leads')
      .set('Cookie', cookie)
      .send(leadPayload);
    expect(created.status).toBe(201);
    leadId = created.body.lead.id;
  });

  it('rejects a missing leadId with 400', async () => {
    const res = await request(app)
      .post('/api/ai/proposal')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns 404 for an unknown lead', async () => {
    const res = await request(app)
      .post('/api/ai/proposal')
      .set('Cookie', cookie)
      .send({ leadId: '00000000-0000-4000-8000-000000000000' });
    expect(res.status).toBe(404);
  });

  it('generates a structured proposal with constrained decoding', async () => {
    ai.nextResponse = JSON.stringify(validProposal);
    const res = await request(app)
      .post('/api/ai/proposal')
      .set('Cookie', cookie)
      .send({ leadId, requirements: 'Include a Nepali payment gateway.' });

    expect(res.status).toBe(200);
    expect(res.body.proposal).toEqual(validProposal);

    expect(ai.lastPrompt).toContain('Sita Gurung');
    expect(ai.lastPrompt).toContain('Budget: 40000 to 60000 NPR');
    expect(ai.lastPrompt).toContain('Include a Nepali payment gateway.');
    expect(ai.lastOptions?.system).toContain('untrusted data');
    expect(ai.lastOptions?.temperature).toBe(0);
    expect(ai.lastOptions?.seed).toBe(42);
    expect(ai.lastOptions?.numPredict).toBe(1400);
    expect(typeof ai.lastOptions?.format).toBe('object');
    const schema = ai.lastOptions?.format as { required?: string[] };
    expect(schema.required).toEqual(Object.keys(validProposal));
  });

  it('rejects invalid JSON with a useful 502', async () => {
    ai.nextResponse = 'Sure! Here you go: <not json>';
    const res = await request(app)
      .post('/api/ai/proposal')
      .set('Cookie', cookie)
      .send({ leadId });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('invalid JSON');
  });

  it('rejects output failing Zod validation naming the fields', async () => {
    ai.nextResponse = JSON.stringify({
      ...validProposal,
      scope: 'just one string',
      pricing: '',
    });
    const res = await request(app)
      .post('/api/ai/proposal')
      .set('Cookie', cookie)
      .send({ leadId });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('failed validation');
    expect(res.body.error).toContain('scope');
    expect(res.body.error).toContain('pricing');
  });

  it('saves a reviewed proposal and lists it', async () => {
    const saveRes = await request(app)
      .post(`/api/leads/${leadId}/proposals`)
      .set('Cookie', cookie)
      .send(validProposal);
    expect(saveRes.status).toBe(201);
    savedProposalId = saveRes.body.proposal.id;
    expect(saveRes.body.proposal.leadId).toBe(leadId);

    const listRes = await request(app)
      .get(`/api/leads/${leadId}/proposals`)
      .set('Cookie', cookie);
    expect(listRes.status).toBe(200);
    expect(listRes.body.proposals).toHaveLength(1);
    expect(listRes.body.proposals[0].title).toBe(validProposal.title);
  });

  it('rejects an invalid saved proposal with 400', async () => {
    const res = await request(app)
      .post(`/api/leads/${leadId}/proposals`)
      .set('Cookie', cookie)
      .send({ ...validProposal, title: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('deletes a proposal, then it is gone', async () => {
    const del = await request(app)
      .delete(`/api/leads/${leadId}/proposals/${savedProposalId}`)
      .set('Cookie', cookie);
    expect(del.status).toBe(204);

    const listRes = await request(app)
      .get(`/api/leads/${leadId}/proposals`)
      .set('Cookie', cookie);
    expect(listRes.body.proposals).toHaveLength(0);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, email));
    await pool.end();
  });
});
