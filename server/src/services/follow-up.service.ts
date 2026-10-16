import type { AiProvider } from './ai/provider';
import { draftFollowUp } from './ai/ai.service';
import { getConversations } from './conversation.service';
import { getLead } from './lead.service';

/** Conversation context sent to the model: the most recent messages only. */
const MAX_MESSAGES = 12;

export async function generateFollowUp(
  ai: AiProvider,
  userId: string,
  leadId: string,
): Promise<string> {
  const lead = await getLead(userId, leadId);
  const conversations = await getConversations(userId, leadId);
  const messages = conversations
    .flatMap((conversation) => conversation.messages)
    .slice(-MAX_MESSAGES);

  return draftFollowUp(ai, { lead, messages });
}
