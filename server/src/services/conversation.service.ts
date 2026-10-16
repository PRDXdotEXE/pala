import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client';
import { conversations, leads, messages } from '../db/schema';
import { HttpError } from '../utils/http-error';
import type { AddMessageInput } from '../schemas/conversation.schema';
import { getLead } from './lead.service';

async function getOwnedConversation(userId: string, conversationId: string) {
  const [row] = await db
    .select({ conversation: conversations })
    .from(conversations)
    .innerJoin(leads, eq(leads.id, conversations.leadId))
    .where(
      and(eq(conversations.id, conversationId), eq(leads.userId, userId)),
    )
    .limit(1);
  if (!row) throw new HttpError(404, 'Conversation not found');
  return row.conversation;
}

export async function createConversation(userId: string, leadId: string) {
  await getLead(userId, leadId);

  const [conversation] = await db
    .insert(conversations)
    .values({ leadId })
    .returning();
  if (!conversation) throw new HttpError(500, 'Failed to create conversation');
  return conversation;
}

export async function getConversationMessages(
  userId: string,
  conversationId: string,
) {
  const conversation = await getOwnedConversation(userId, conversationId);
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt));
}

export async function addMessageToConversation(
  userId: string,
  conversationId: string,
  input: AddMessageInput,
) {
  await getOwnedConversation(userId, conversationId);

  const [message] = await db
    .insert(messages)
    .values({ conversationId, role: input.role, content: input.content })
    .returning();
  if (!message) throw new HttpError(500, 'Failed to save message');

  return message;
}

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
