import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { users } from '../src/db/schema';
import type { AiProvider } from '../src/services/ai/provider';

class NoCallAiProvider implements AiProvider {
  readonly name = 'mock';
  async health() {
    return { ok: true, model: 'mock-model' };
  }
  async generate(): Promise<string> {
    throw new Error('AI must not be called in this suite');
  }
}

const app = createApp(new NoCallAiProvider());
const stamp = Date.now();
const ownerEmail = `leads-filters-owner-${stamp}@test.dev`;
const otherEmail = `leads-filters-other-${stamp}@test.dev`;

function sessionCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (!first) throw new Error('no set-cookie header');
  return first.split(';')[0];
}

function dayOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

async function createLead(cookie: string, payload: Record<string, unknown>) {
  const res = await request(app).post('/api/leads').set('Cookie', cookie).send(payload);
  expect(res.status).toBe(201);
  return res.body.lead;
}

describe('GET /api/leads with search and filters', () => {
  let ownerCookie: string;
  let otherCookie: string;
  let aId: string;
  let bId: string;
  let cId: string;
  let dId: string;

  beforeAll(async () => {
    const owner = await request(app).post('/api/auth/register').send({
      name: 'Owner',
      email: ownerEmail,
      password: 'password123',
    });
    expect(owner.status).toBe(201);
    ownerCookie = sessionCookie(owner);

    const other = await request(app).post('/api/auth/register').send({
      name: 'Other',
      email: otherEmail,
      password: 'password123',
    });
    expect(other.status).toBe(201);
    otherCookie = sessionCookie(other);

    aId = (
      await createLead(ownerCookie, {
        clientName: 'Anika Shrestha',
        company: 'Everest Tours',
        project: 'Trekking booking site',
        status: 'interested',
        priority: 'high',
        nextFollowUp: dayOffset(-1),
      })
    ).id;
    bId = (
      await createLead(ownerCookie, {
        clientName: 'Bikash Rai',
        company: 'Kathmandu Coffee',
        project: 'Loyalty app',
        status: 'contacted',
        priority: 'medium',
        nextFollowUp: dayOffset(0),
      })
    ).id;
    cId = (
      await createLead(ownerCookie, {
        clientName: 'Classic Furniture',
        company: 'Classic Furniture',
        project: 'E-commerce store',
        status: 'proposal_sent',
        priority: 'low',
        nextFollowUp: dayOffset(3),
      })
    ).id;
    dId = (
      await createLead(ownerCookie, {
        clientName: 'No Followup Ltd',
        status: 'new',
        priority: 'medium',
      })
    ).id;

    await createLead(otherCookie, {
      clientName: 'Anika Secret Other',
      status: 'interested',
      priority: 'high',
      nextFollowUp: dayOffset(-2),
    });
  });

  it('searches client, company and project case-insensitively', async () => {
    const byName = await request(app)
      .get('/api/leads')
      .query({ q: 'ANIKA' })
      .set('Cookie', ownerCookie);
    expect(byName.status).toBe(200);
    expect(byName.body.leads.map((l: { id: string }) => l.id)).toEqual([aId]);

    const byProject = await request(app)
      .get('/api/leads')
      .query({ q: 'loyalty' })
      .set('Cookie', ownerCookie);
    expect(byProject.body.leads.map((l: { id: string }) => l.id)).toEqual([bId]);

    const byCompany = await request(app)
      .get('/api/leads')
      .query({ q: 'everest' })
      .set('Cookie', ownerCookie);
    expect(byCompany.body.leads.map((l: { id: string }) => l.id)).toEqual([aId]);
  });

  it('never returns another user’s leads for a matching search', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ q: 'Anika' })
      .set('Cookie', otherCookie);
    expect(res.status).toBe(200);
    expect(res.body.leads).toHaveLength(1);
    expect(res.body.leads[0].clientName).toBe('Anika Secret Other');
  });

  it('filters by status and priority', async () => {
    const byStatus = await request(app)
      .get('/api/leads')
      .query({ status: 'proposal_sent' })
      .set('Cookie', ownerCookie);
    expect(byStatus.body.leads.map((l: { id: string }) => l.id)).toEqual([cId]);

    const byPriority = await request(app)
      .get('/api/leads')
      .query({ priority: 'high' })
      .set('Cookie', ownerCookie);
    expect(byPriority.body.leads.map((l: { id: string }) => l.id)).toEqual([aId]);
  });

  it('filters follow-ups into overdue / today / upcoming', async () => {
    const overdue = await request(app)
      .get('/api/leads')
      .query({ followUp: 'overdue' })
      .set('Cookie', ownerCookie);
    expect(overdue.body.leads.map((l: { id: string }) => l.id)).toEqual([aId]);

    const today = await request(app)
      .get('/api/leads')
      .query({ followUp: 'today' })
      .set('Cookie', ownerCookie);
    expect(today.body.leads.map((l: { id: string }) => l.id)).toEqual([bId]);

    const upcoming = await request(app)
      .get('/api/leads')
      .query({ followUp: 'upcoming' })
      .set('Cookie', ownerCookie);
    expect(upcoming.body.leads.map((l: { id: string }) => l.id)).toEqual([cId]);
  });

  it('combines filters', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ q: 'Classic', status: 'proposal_sent', priority: 'low', followUp: 'upcoming' })
      .set('Cookie', ownerCookie);
    expect(res.body.leads.map((l: { id: string }) => l.id)).toEqual([cId]);

    const contradiction = await request(app)
      .get('/api/leads')
      .query({ q: 'Classic', status: 'lost' })
      .set('Cookie', ownerCookie);
    expect(contradiction.body.leads).toEqual([]);
  });

  it('rejects invalid filter values with 400', async () => {
    const res = await request(app)
      .get('/api/leads')
      .query({ status: 'banana' })
      .set('Cookie', ownerCookie);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('returns all owned leads when no filters are given', async () => {
    const res = await request(app).get('/api/leads').set('Cookie', ownerCookie);
    expect(res.status).toBe(200);
    expect(res.body.leads).toHaveLength(4);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, ownerEmail));
    await db.delete(users).where(eq(users.email, otherEmail));
    await pool.end();
  });
});
