import { api } from './client';
import type { Conversation, Message, MessageRole } from '../types';

export interface ConversationsResponse {
  conversations: Conversation[];
}

export interface ConversationResponse {
  conversation: Conversation;
}

export interface MessagesResponse {
  messages: Message[];
}

export interface MessageResponse {
  message: Message;
}

export function fetchConversations(leadId: string): Promise<ConversationsResponse> {
  return api<ConversationsResponse>(`/leads/${leadId}/conversations`);
}

export function createConversation(leadId: string): Promise<ConversationResponse> {
  return api<ConversationResponse>(`/leads/${leadId}/conversations`, {
    method: 'POST',
    body: {},
  });
}

export function fetchMessages(conversationId: string): Promise<MessagesResponse> {
  return api<MessagesResponse>(`/conversations/${conversationId}/messages`);
}

export function postMessage(
  conversationId: string,
  body: { role: MessageRole; content: string },
): Promise<MessageResponse> {
  return api<MessageResponse>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body,
  });
}
