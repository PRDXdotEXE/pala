import { api } from './client';
import type { Lead, LeadPayload, LeadStatus, Priority, Proposal, SavedProposal } from '../types';

export interface LeadsResponse {
  leads: Lead[];
}

export interface LeadResponse {
  lead: Lead;
}

export interface ProposalsResponse {
  proposals: SavedProposal[];
}

export interface ProposalSavedResponse {
  proposal: SavedProposal;
}

export interface LeadFilters {
  q?: string;
  status?: LeadStatus;
  priority?: Priority;
  followUp?: 'today' | 'overdue' | 'upcoming';
}

export function fetchLeads(filters: LeadFilters = {}): Promise<LeadsResponse> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.followUp) params.set('followUp', filters.followUp);
  const qs = params.toString();
  return api<LeadsResponse>(`/leads${qs ? `?${qs}` : ''}`);
}

export function fetchLead(id: string): Promise<LeadResponse> {
  return api<LeadResponse>(`/leads/${id}`);
}

export function createLead(body: LeadPayload): Promise<LeadResponse> {
  return api<LeadResponse>('/leads', { method: 'POST', body });
}

export function updateLead(id: string, body: Partial<LeadPayload>): Promise<LeadResponse> {
  return api<LeadResponse>(`/leads/${id}`, { method: 'PATCH', body });
}

export function deleteLead(id: string): Promise<void> {
  return api<void>(`/leads/${id}`, { method: 'DELETE' });
}

export function fetchProposals(leadId: string): Promise<ProposalsResponse> {
  return api<ProposalsResponse>(`/leads/${leadId}/proposals`);
}

export function saveProposal(leadId: string, proposal: Proposal): Promise<ProposalSavedResponse> {
  return api<ProposalSavedResponse>(`/leads/${leadId}/proposals`, {
    method: 'POST',
    body: proposal,
  });
}

export function deleteProposal(leadId: string, proposalId: string): Promise<void> {
  return api<void>(`/leads/${leadId}/proposals/${proposalId}`, { method: 'DELETE' });
}
