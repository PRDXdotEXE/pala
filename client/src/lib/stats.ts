import { isToday } from './format';
import type { Lead } from '../types';

const ACTIVE_STATUSES = new Set([
  'new',
  'contacted',
  'interested',
  'proposal_sent',
  'negotiating',
]);

const POTENTIAL_STATUSES = new Set(['interested', 'proposal_sent', 'negotiating']);

export interface LeadStats {
  total: number;
  active: number;
  followUpsToday: number;
  converted: number;
  lost: number;
  potentialByCurrency: { currency: string; amount: number }[];
}

export function isActive(lead: Lead): boolean {
  return ACTIVE_STATUSES.has(lead.status);
}

export function isPotentialDeal(lead: Lead): boolean {
  return POTENTIAL_STATUSES.has(lead.status);
}

export function computeStats(leads: Lead[]): LeadStats {
  const totals = new Map<string, number>();

  for (const lead of leads) {
    if (isActive(lead)) {
      const budget = lead.budgetMax ?? lead.budgetMin ?? 0;
      totals.set(lead.currency, (totals.get(lead.currency) ?? 0) + budget);
    }
  }

  return {
    total: leads.length,
    active: leads.filter(isActive).length,
    followUpsToday: leads.filter((lead) => isToday(lead.nextFollowUp)).length,
    converted: leads.filter((lead) => lead.status === 'converted').length,
    lost: leads.filter((lead) => lead.status === 'lost').length,
    potentialByCurrency: [...totals.entries()].map(([currency, amount]) => ({
      currency,
      amount,
    })),
  };
}
