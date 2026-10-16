import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { conversations, messages } from '../db/schema';
import { HttpError } from '../utils/http-error';
import type { AddMessageInput } from '../schemas/conversation.schema';
import { getLead } from './lead.service';

export async function getConversations(userId: string, leadId: string) {
  await getLead(userId, leadId);

  const leadConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.leadId, leadId))
    .orderBy(asc(conversations.createdAt));

  if (leadConversations.length === 0) return [];

  const conversationIds = leadConversations.map((c) => c.id);
  const leadMessages = await db
    .select()
    .from(messages)
    .where(inArray(messages.conversationId, conversationIds))
    .orderBy(asc(messages.createdAt));

  return leadConversations.map((conversation) => ({
    ...conversation,
    messages: leadMessages.filter((m) => m.conversationId === conversation.id),
  }));
}

export async function addMessage(
  userId: string,
  leadId: string,
  input: AddMessageInput,
) {
  await getLead(userId, leadId);

  const [latest] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.leadId, leadId))
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  let conversationId: string;
  if (latest) {
    conversationId = latest.id;
  } else {
    const [created] = await db
      .insert(conversations)
      .values({ leadId })
      .returning();
    if (!created) throw new HttpError(500, 'Failed to create conversation');
    conversationId = created.id;
  }

  const [message] = await db
    .insert(messages)
    .values({ conversationId, role: input.role, content: input.content })
    .returning();
  if (!message) throw new HttpError(500, 'Failed to save message');

  return message;
}
