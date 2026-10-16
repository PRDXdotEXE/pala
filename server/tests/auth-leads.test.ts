import { inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createAiProvider } from '../src/services/ai';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';

const app = createApp(createAiProvider());
const stamp = Date.now();
const emailA = `user-a-${stamp}@test.dev`;
const emailB = `user-b-${stamp}@test.dev`;

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) throw new Error('no set-cookie header');
  return first.split(';')[0];
}

describe('auth + lead authorization', () => {
  let cookieA: string;
  let cookieB: string;
  let leadId: string;

  it('registers two users and returns session cookies', async () => {
    const resA = await request(app).post('/api/auth/register').send({
      name: 'User A',
      email: emailA,
      password: 'password123',
    });
    expect(resA.status).toBe(201);
    expect(resA.body.user.email).toBe(emailA);
    expect(JSON.stringify(resA.body)).not.toContain('passwordHash');
    cookieA = sessionCookie(resA);

    const resB = await request(app).post('/api/auth/register').send({
      name: 'User B',
      email: emailB,
      password: 'password123',
    });
    expect(resB.status).toBe(201);
    cookieB = sessionCookie(resB);
  });

  it('rejects duplicate email, bad credentials, and invalid payloads', async () => {
    const dup = await request(app).post('/api/auth/register').send({
      name: 'Dup',
      email: emailA,
      password: 'password123',
    });
    expect(dup.status).toBe(409);

    const badLogin = await request(app).post('/api/auth/login').send({
      email: emailA,
      password: 'wrong-password',
    });
    expect(badLogin.status).toBe(401);

    const badValidation = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: 'short',
    });
    expect(badValidation.status).toBe(400);
  });

  it('reports the current user via /me and 401s without a session', async () => {
    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieA);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(emailA);

    const anon = await request(app).get('/api/auth/me');
    expect(anon.status).toBe(401);
  });

  it('User A creates Lead A', async () => {
    const res = await request(app)
      .post('/api/leads')
      .set('Cookie', cookieA)
      .send({
        clientName: 'ABC Restaurant',
        company: 'ABC Restaurant',
        project: 'Restaurant Website',
        budgetMin: 40000,
        budgetMax: 40000,
        currency: 'NPR',
        status: 'interested',
        priority: 'high',
      });
    expect(res.status).toBe(201);
    expect(res.body.lead.clientName).toBe('ABC Restaurant');
    expect(res.body.lead.status).toBe('interested');
    expect(res.body.lead.currency).toBe('NPR');
    leadId = res.body.lead.id;
  });

  it('rejects unauthenticated lead access', async () => {
    const anon = await request(app).get('/api/leads');
    expect(anon.status).toBe(401);

    const anonGet = await request(app).get(`/api/leads/${leadId}`);
    expect(anonGet.status).toBe(401);
  });

  it('User B cannot read Lead A', async () => {
    const res = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Cookie', cookieB);
    expect(res.status).toBe(404);
  });

  it('User B cannot update Lead A', async () => {
    const res = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Cookie', cookieB)
      .send({ clientName: 'Hijacked' });
    expect(res.status).toBe(404);
  });

  it('User B cannot delete Lead A', async () => {
    const res = await request(app)
      .delete(`/api/leads/${leadId}`)
      .set('Cookie', cookieB);
    expect(res.status).toBe(404);
  });

  it('User B does not see Lead A in their list', async () => {
    const res = await request(app)
      .get('/api/leads')
      .set('Cookie', cookieB);
    expect(res.status).toBe(200);
    expect(res.body.leads).toEqual([]);
  });

  it('User A can post and read messages on Lead A', async () => {
    const posted = await request(app)
      .post(`/api/leads/${leadId}/messages`)
      .set('Cookie', cookieA)
      .send({ role: 'client', content: 'I need a restaurant website.' });
    expect(posted.status).toBe(201);
    expect(posted.body.message.role).toBe('client');

    const read = await request(app)
      .get(`/api/leads/${leadId}/conversations`)
      .set('Cookie', cookieA);
    expect(read.status).toBe(200);
    expect(read.body.conversations.length).toBeGreaterThan(0);
    expect(read.body.conversations[0].messages[0].content).toBe(
      'I need a restaurant website.',
    );
  });

  it('User B cannot read or post messages on Lead A', async () => {
    const read = await request(app)
      .get(`/api/leads/${leadId}/conversations`)
      .set('Cookie', cookieB);
    expect(read.status).toBe(404);

    const post = await request(app)
      .post(`/api/leads/${leadId}/messages`)
      .set('Cookie', cookieB)
      .send({ role: 'user', content: 'let me in' });
    expect(post.status).toBe(404);
  });

  it('invalid message payload returns 400', async () => {
    const res = await request(app)
      .post(`/api/leads/${leadId}/messages`)
      .set('Cookie', cookieA)
      .send({ role: 'narrator', content: '' });
    expect(res.status).toBe(400);
  });

  it('User A reads, updates, and deletes Lead A (CRUD)', async () => {
    const read = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Cookie', cookieA);
    expect(read.status).toBe(200);
    expect(read.body.lead.clientName).toBe('ABC Restaurant');

    const update = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Cookie', cookieA)
      .send({ status: 'proposal_sent', priority: 'medium' });
    expect(update.status).toBe(200);
    expect(update.body.lead.status).toBe('proposal_sent');
    expect(update.body.lead.priority).toBe('medium');
    expect(update.body.lead.clientName).toBe('ABC Restaurant');

    const del = await request(app)
      .delete(`/api/leads/${leadId}`)
      .set('Cookie', cookieA);
    expect(del.status).toBe(204);

    const gone = await request(app)
      .get(`/api/leads/${leadId}`)
      .set('Cookie', cookieA);
    expect(gone.status).toBe(404);
  });

  it('invalid lead id returns 404, not 500', async () => {
    const res = await request(app)
      .get('/api/leads/not-a-uuid')
      .set('Cookie', cookieA);
    expect(res.status).toBe(404);
  });

  it('logout clears the session', async () => {
    const out = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieA);
    expect(out.status).toBe(200);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie(out));
    expect(me.status).toBe(401);
  });

  it('logs in again with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: emailA,
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(emailA);
  });

  afterAll(async () => {
    await db.delete(users).where(inArray(users.email, [emailA, emailB]));
    await pool.end();
  });
});
