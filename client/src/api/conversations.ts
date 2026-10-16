import { api } from './client';
import type { Conversation, Message, MessageRole } from '../types';

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface MessageResponse {
  message: Message;
}

export function fetchConversations(leadId: string): Promise<ConversationsResponse> {
  return api<ConversationsResponse>(`/leads/${leadId}/conversations`);
}

export function postMessage(
  leadId: string,
  body: { role: MessageRole; content: string },
): Promise<MessageResponse> {
  return api<MessageResponse>(`/leads/${leadId}/messages`, { method: 'POST', body });
}
