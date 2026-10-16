import type { LeadExtraction, LeadPayload } from '../types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null): value is string {
  return value != null && ISO_DATE.test(value);
}

/**
 * Extraction -> editable lead draft. Values the model could not state fall back
 * to the same defaults the manual form uses; a deadline the model stated in
 * words ("Before Dashain") is dropped here because the lead column is a date —
 * the review UI warns about it instead of silently inventing a date.
 */
export function extractionToDraft(extraction: LeadExtraction): LeadPayload {
  return {
    clientName: extraction.clientName ?? '',
    company: extraction.company,
    project: extraction.project,
    description: extraction.description,
    budgetMin: extraction.budgetMin,
    budgetMax: extraction.budgetMax,
    currency: extraction.currency ?? 'USD',
    status: extraction.status ?? 'new',
    priority: extraction.priority ?? 'medium',
    deadline: isIsoDate(extraction.deadline) ? extraction.deadline : null,
    nextFollowUp: null,
  };
}
