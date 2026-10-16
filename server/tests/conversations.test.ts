import { inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createAiProvider } from '../src/services/ai';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';

const app = createApp(createAiProvider());
const stamp = Date.now();
const emailA = `conv-a-${stamp}@test.dev`;
const emailB = `conv-b-${stamp}@test.dev`;

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) throw new Error('no set-cookie header');
  return first.split(';')[0];
}

describe('conversation system (no AI)', () => {
  let cookieA: string;
  let cookieB: string;
  let leadId: string;
  let conversationId: string;

  it('sets up two users and a lead owned by User A', async () => {
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Conv A',
      email: emailA,
      password: 'password123',
    });
    expect(resA.status).toBe(201);
    cookieA = sessionCookie(resA);

    const resB = await request(app).post('/api/auth/register').send({
      name: 'Conv B',
      email: emailB,
      password: 'password123',
    });
    expect(resB.status).toBe(201);
    cookieB = sessionCookie(resB);

    const lead = await request(app)
      .post('/api/leads')
      .set('Cookie', cookieA)
      .send({ clientName: 'Pokhara Restaurant' });
    expect(lead.status).toBe(201);
    leadId = lead.body.lead.id;
  });

  it('creates a conversation for the lead (POST /api/leads/:id/conversations)', async () => {
    const res = await request(app)
      .post(`/api/leads/${leadId}/conversations`)
      .set('Cookie', cookieA)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.conversation.leadId).toBe(leadId);
    expect(res.body.conversation.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    conversationId = res.body.conversation.id;
  });

  it('lists conversations for the lead (GET /api/leads/:id/conversations)', async () => {
    const res = await request(app)
      .get(`/api/leads/${leadId}/conversations`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.conversations).toHaveLength(1);
    expect(res.body.conversations[0].id).toBe(conversationId);
    expect(res.body.conversations[0].messages).toEqual([]);
  });

  it('stores a pasted client conversation as messages', async () => {
    const pasted = [
      'Hi, I own a restaurant in Pokhara.',
      'I need a modern website.',
      'Budget is around 40k.',
      'Would like it before Dashain.',
    ].join('\n');

    const post = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieA)
      .send({ role: 'client', content: pasted });
    expect(post.status).toBe(201);
    expect(post.body.message.role).toBe('client');
    expect(post.body.message.content).toContain('restaurant in Pokhara');

    const userReply = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieA)
      .send({ role: 'user', content: 'Great, I can build that.' });
    expect(userReply.status).toBe(201);
  });

  it('retrieves the messages (GET /api/conversations/:id/messages)', async () => {
    const res = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.messages[0].role).toBe('client');
    expect(res.body.messages[1].role).toBe('user');
  });

  it('returns conversations with their messages for the lead', async () => {
    const res = await request(app)
      .get(`/api/leads/${leadId}/conversations`)
      .set('Cookie', cookieA);
    expect(res.status).toBe(200);
    expect(res.body.conversations[0].messages).toHaveLength(2);
  });

  it('User B cannot create, read, or write conversations on Lead A (404)', async () => {
    const create = await request(app)
      .post(`/api/leads/${leadId}/conversations`)
      .set('Cookie', cookieB)
      .send({});
    expect(create.status).toBe(404);

    const read = await request(app)
      .get(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieB);
    expect(read.status).toBe(404);

    const write = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieB)
      .send({ role: 'user', content: 'let me in' });
    expect(write.status).toBe(404);
  });

  it('rejects invalid message payloads and unknown conversations', async () => {
    const badPayload = await request(app)
      .post(`/api/conversations/${conversationId}/messages`)
      .set('Cookie', cookieA)
      .send({ role: 'narrator', content: '' });
    expect(badPayload.status).toBe(400);

    const unknown = await request(app)
      .get('/api/conversations/not-a-uuid/messages')
      .set('Cookie', cookieA);
    expect(unknown.status).toBe(404);

    const missing = await request(app)
      .get('/api/conversations/00000000-0000-4000-8000-000000000000/messages')
      .set('Cookie', cookieA);
    expect(missing.status).toBe(404);
  });

  it('requires authentication for conversation endpoints', async () => {
    const anonCreate = await request(app)
      .post(`/api/leads/${leadId}/conversations`)
      .send({});
    expect(anonCreate.status).toBe(401);

    const anonRead = await request(app).get(
      `/api/conversations/${conversationId}/messages`,
    );
    expect(anonRead.status).toBe(401);
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.email, [emailA, emailB]));
    await pool.end();
  });
});
