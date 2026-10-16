import { api } from './client';
import type { Lead, LeadPayload } from '../types';

export interface LeadsResponse {
  leads: Lead[];
}

export interface LeadResponse {
  lead: Lead;
}

export function fetchLeads(): Promise<LeadsResponse> {
  return api<LeadsResponse>('/leads');
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
