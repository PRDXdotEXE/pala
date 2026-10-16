import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Lead, LeadPayload, LeadStatus, Priority } from '../types';

interface FormState {
  clientName: string;
  company: string;
  project: string;
  description: string;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  status: LeadStatus;
  priority: Priority;
  deadline: string;
  nextFollowUp: string;
}

const STATUSES: LeadStatus[] = [
  'new',
  'contacted',
  'interested',
  'proposal_sent',
  'negotiating',
  'converted',
  'lost',
];

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function emptyState(): FormState {
  return {
    clientName: '',
    company: '',
    project: '',
    description: '',
    budgetMin: '',
    budgetMax: '',
    currency: 'USD',
    status: 'new',
    priority: 'medium',
    deadline: '',
    nextFollowUp: '',
  };
}

function fromLead(lead: Lead): FormState {
  return {
    clientName: lead.clientName,
    company: lead.company ?? '',
    project: lead.project ?? '',
    description: lead.description ?? '',
    budgetMin: lead.budgetMin != null ? String(lead.budgetMin) : '',
    budgetMax: lead.budgetMax != null ? String(lead.budgetMax) : '',
    currency: lead.currency,
    status: lead.status,
    priority: lead.priority,
    deadline: lead.deadline ?? '',
    nextFollowUp: toLocalInput(lead.nextFollowUp),
  };
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700';

export function LeadForm({
  initial,
  submitLabel,
  onSubmit,
  onError,
}: {
  initial?: Lead;
  submitLabel: string;
  onSubmit: (payload: LeadPayload) => Promise<unknown>;
  onError?: (message: string) => void;
}) {
  const [state, setState] = useState<FormState>(() =>
    initial ? fromLead(initial) : emptyState(),
  );
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLocalError(null);

    if (state.clientName.trim() === '') {
      setLocalError('Client name is required.');
      return;
    }

    const budgetMin = parseNumber(state.budgetMin);
    const budgetMax = parseNumber(state.budgetMax);
    if (budgetMin != null && budgetMax != null && budgetMax < budgetMin) {
      setLocalError('Max budget cannot be less than min budget.');
      return;
    }

    const payload: LeadPayload = {
      clientName: state.clientName.trim(),
      company: state.company.trim() || null,
      project: state.project.trim() || null,
      description: state.description.trim() || null,
      budgetMin,
      budgetMax,
      currency: (state.currency.trim().toUpperCase() || 'USD').slice(0, 3),
      status: state.status,
      priority: state.priority,
      deadline: state.deadline || null,
      nextFollowUp: state.nextFollowUp
        ? new Date(state.nextFollowUp).toISOString()
        : null,
    };

    setBusy(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setLocalError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {localError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {localError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="clientName">
            Client name *
          </label>
          <input
            id="clientName"
            className={inputClass}
            value={state.clientName}
            onChange={(e) => set('clientName', e.target.value)}
            placeholder="ABC Restaurant"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="company">
            Company
          </label>
          <input
            id="company"
            className={inputClass}
            value={state.company}
            onChange={(e) => set('company', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="project">
            Project
          </label>
          <input
            id="project"
            className={inputClass}
            value={state.project}
            onChange={(e) => set('project', e.target.value)}
            placeholder="Restaurant Website"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className={inputClass}
            rows={3}
            value={state.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="budgetMin">
            Budget min
          </label>
          <input
            id="budgetMin"
            className={inputClass}
            type="number"
            min={0}
            value={state.budgetMin}
            onChange={(e) => set('budgetMin', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="budgetMax">
            Budget max
          </label>
          <input
            id="budgetMax"
            className={inputClass}
            type="number"
            min={0}
            value={state.budgetMax}
            onChange={(e) => set('budgetMax', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="currency">
            Currency
          </label>
          <input
            id="currency"
            className={inputClass}
            value={state.currency}
            onChange={(e) => set('currency', e.target.value)}
            maxLength={3}
            placeholder="USD"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={inputClass}
            value={state.status}
            onChange={(e) => set('status', e.target.value as LeadStatus)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            className={inputClass}
            value={state.priority}
            onChange={(e) => set('priority', e.target.value as Priority)}
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="deadline">
            Deadline
          </label>
          <input
            id="deadline"
            className={inputClass}
            type="date"
            value={state.deadline}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="nextFollowUp">
            Next follow-up
          </label>
          <input
            id="nextFollowUp"
            className={inputClass}
            type="datetime-local"
            value={state.nextFollowUp}
            onChange={(e) => set('nextFollowUp', e.target.value)}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
