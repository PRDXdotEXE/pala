import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { HttpError } from '../utils/http-error';
import type { CreateLeadInput, UpdateLeadInput } from '../schemas/lead.schema';

export async function listLeads(userId: string) {
  return db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId))
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
