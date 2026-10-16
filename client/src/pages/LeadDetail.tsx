import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteLead, fetchLead, updateLead } from '../api/leads';
import { ApiError } from '../api/client';
import { ConversationPanel } from '../components/ConversationPanel';
import { LeadForm } from '../components/LeadForm';
import { PriorityBadge, StatusBadge } from '../components/badges';
import { formatBudget, formatDate, formatDateTime } from '../lib/format';
import type { LeadPayload } from '../types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}

export function LeadDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const leadQuery = useQuery({
    queryKey: ['lead', id],
    queryFn: () => fetchLead(id),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<LeadPayload>) => updateLead(id, payload),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate('/leads', { replace: true });
    },
  });

  if (leadQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (leadQuery.isError) {
    const notFound =
      leadQuery.error instanceof ApiError && leadQuery.error.status === 404;
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
        <p className="text-sm text-gray-600">
          {notFound ? 'Lead not found.' : 'Failed to load lead.'}
        </p>
        <Link to="/leads" className="mt-3 inline-block text-sm text-blue-600 underline">
          Back to leads
        </Link>
      </div>
    );
  }

  const lead = leadQuery.data?.lead;
  if (!lead) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/leads" className="text-sm text-gray-500 hover:underline">
          ← Leads
        </Link>
        <h1 className="flex-1 text-xl font-bold text-gray-900">{lead.clientName}</h1>
        <StatusBadge status={lead.status} />
        <PriorityBadge priority={lead.priority} />
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          {editing ? 'Cancel edit' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete lead "${lead.clientName}"?`)) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {deleteMutation.isError && (
        <p className="text-sm text-red-600">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : 'Delete failed'}
        </p>
      )}

      {editing ? (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Edit lead</h2>
          <LeadForm
            initial={lead}
            submitLabel="Save changes"
            onSubmit={(payload) => updateMutation.mutateAsync(payload)}
          />
        </section>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Company" value={lead.company ?? '—'} />
            <DetailRow label="Project" value={lead.project ?? '—'} />
            <DetailRow label="Budget" value={formatBudget(lead)} />
            <DetailRow label="Deadline" value={formatDate(lead.deadline)} />
            <DetailRow label="Next follow-up" value={formatDateTime(lead.nextFollowUp)} />
            <DetailRow label="Created" value={formatDateTime(lead.createdAt)} />
          </dl>
          {lead.description && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs uppercase text-gray-400">Description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                {lead.description}
              </p>
            </div>
          )}
        </section>
      )}

      <ConversationPanel leadId={lead.id} />
    </div>
  );
}
