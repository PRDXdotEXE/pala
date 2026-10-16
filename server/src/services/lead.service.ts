import { and, desc, eq, gte, ilike, lt, or, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { HttpError } from '../utils/http-error';
import type {
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from '../schemas/lead.schema';

function localDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function followUpCondition(followUp: NonNullable<ListLeadsQuery['followUp']>): SQL {
  const today = localDayStart(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  switch (followUp) {
    case 'today':
      return and(gte(leads.nextFollowUp, today), lt(leads.nextFollowUp, tomorrow)) as SQL;
    case 'overdue':
      return lt(leads.nextFollowUp, today) as SQL;
    case 'upcoming':
      return gte(leads.nextFollowUp, tomorrow) as SQL;
  }
}

export async function listLeads(userId: string, filters: ListLeadsQuery = {}) {
  const conditions: SQL[] = [eq(leads.userId, userId)];

  if (filters.q) {
    const pattern = `%${filters.q}%`;
    conditions.push(
      or(
        ilike(leads.clientName, pattern),
        ilike(leads.company, pattern),
        ilike(leads.project, pattern),
      ) as SQL,
    );
  }
  if (filters.status) conditions.push(eq(leads.status, filters.status));
  if (filters.priority) conditions.push(eq(leads.priority, filters.priority));
  if (filters.followUp) conditions.push(followUpCondition(filters.followUp));

  return db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));
}

export async function getLead(userId: string, leadId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
    .limit(1);
  if (!lead) throw new HttpError(404, 'Lead not found');
  return lead;
}

export async function createLead(userId: string, input: CreateLeadInput) {
  const [lead] = await db
    .insert(leads)
    .values({ ...input, userId })
    .returning();
  if (!lead) throw new HttpError(500, 'Failed to create lead');
  return lead;
}

export async function updateLead(
  userId: string,
  leadId: string,
  patch: UpdateLeadInput,
) {
  const values = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(values).length > 0) {
    const [updated] = await db
      .update(leads)
      .set(values)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
      .returning();
    if (!updated) throw new HttpError(404, 'Lead not found');
    return updated;
  }

  return getLead(userId, leadId);
}

export async function deleteLead(userId: string, leadId: string): Promise<void> {
  const deleted = await db
    .delete(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
    .returning({ id: leads.id });
  if (deleted.length === 0) throw new HttpError(404, 'Lead not found');
}
