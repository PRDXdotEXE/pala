import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { proposals } from '../db/schema';
import type { SaveProposalInput } from '../schemas/proposal.schema';
import type { AiProvider } from './ai/provider';
import { draftProposal } from './ai/ai.service';
import type { Proposal } from './ai/schemas/proposal';
import { getLead } from './lead.service';
import { HttpError } from '../utils/http-error';

export async function generateProposal(
  ai: AiProvider,
  userId: string,
  leadId: string,
  requirements?: string,
): Promise<Proposal> {
  const lead = await getLead(userId, leadId);
  return draftProposal(ai, { lead, requirements });
}

export async function saveProposal(
  userId: string,
  leadId: string,
  input: SaveProposalInput,
) {
  await getLead(userId, leadId);
  const [proposal] = await db
    .insert(proposals)
    .values({ leadId, ...input })
    .returning();
  if (!proposal) throw new HttpError(500, 'Failed to save proposal');
  return proposal;
}

export async function listProposals(userId: string, leadId: string) {
  await getLead(userId, leadId);
  return db
    .select()
    .from(proposals)
    .where(eq(proposals.leadId, leadId))
    .orderBy(desc(proposals.createdAt));
}

export async function deleteProposal(
  userId: string,
  leadId: string,
  proposalId: string,
): Promise<void> {
  await getLead(userId, leadId);
  const deleted = await db
    .delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.leadId, leadId)))
    .returning({ id: proposals.id });
  if (deleted.length === 0) throw new HttpError(404, 'Proposal not found');
}
