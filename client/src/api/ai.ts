import { api } from './client';
import type { LeadExtraction, Proposal } from '../types';

export interface AnalyzeResponse {
  lead: LeadExtraction;
  /** Present when the pasted conversation contained instruction-like (injection) text. */
  warning?: string;
}

export interface FollowUpResponse {
  message: string;
}

export interface ProposalResponse {
  proposal: Proposal;
}

export function analyzeConversation(conversation: string): Promise<AnalyzeResponse> {
  return api<AnalyzeResponse>('/ai/analyze', { method: 'POST', body: { conversation } });
}

export function generateFollowUp(leadId: string): Promise<FollowUpResponse> {
  return api<FollowUpResponse>('/ai/follow-up', { method: 'POST', body: { leadId } });
}

export function generateProposal(
  leadId: string,
  requirements?: string,
): Promise<ProposalResponse> {
  return api<ProposalResponse>('/ai/proposal', {
    method: 'POST',
    body: { leadId, ...(requirements ? { requirements } : {}) },
  });
}
