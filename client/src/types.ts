export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'interested'
  | 'proposal_sent'
  | 'negotiating'
  | 'converted'
  | 'lost';

export type Priority = 'low' | 'medium' | 'high';

export type MessageRole = 'client' | 'user' | 'assistant';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  userId: string;
  clientName: string;
  company: string | null;
  project: string | null;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  status: LeadStatus;
  priority: Priority;
  deadline: string | null;
  nextFollowUp: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  leadId: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface LeadPayload {
  clientName: string;
  company: string | null;
  project: string | null;
  description: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  status: LeadStatus;
  priority: Priority;
  deadline: string | null;
  nextFollowUp: string | null;
}
