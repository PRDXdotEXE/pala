import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteLead, fetchLead, updateLead } from '../api/leads';
import { ApiError } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ConversationPanel } from '../components/ConversationPanel';
import { FollowUpCard } from '../components/FollowUpCard';
import { LeadForm } from '../components/LeadForm';
import { ProposalCard } from '../components/ProposalCard';
import { Skeleton, SkeletonCard } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { PriorityBadge, StatusBadge } from '../components/badges';
import { formatBudget, formatDate, formatDateTime } from '../lib/format';
import { ui } from '../lib/ui';
import type { LeadPayload } from '../types';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={ui.overline}>{label}</dt>
      <dd className={ui.bodyText}>{value}</dd>
    </div>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <span className="sr-only">Loading lead…</span>
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-56" />
      </div>
      <SkeletonCard lines={4} />
      <SkeletonCard lines={2} />
    </div>
  );
}

export function LeadDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      notify('Lead updated.', 'success');
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : 'Could not save the lead.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(id),
    onSuccess: () => {
      setConfirmDelete(false);
      queryClient.removeQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      notify('Lead deleted.', 'success');
      navigate('/leads', { replace: true });
    },
    onError: (error) => {
      setConfirmDelete(false);
      notify(error instanceof Error ? error.message : 'Could not delete the lead.', 'error');
    },
  });

  if (leadQuery.isLoading) return <LeadDetailSkeleton />;

  if (leadQuery.isError) {
    const notFound =
      leadQuery.error instanceof ApiError && leadQuery.error.status === 404;
    return (
      <div className={ui.empty}>
        <p className={ui.muted}>
          {notFound ? 'Lead not found.' : 'Failed to load lead.'}
        </p>
        <Link to="/leads" className="mt-3 inline-block text-sm text-blue-600 underline dark:text-blue-400">
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
        <Link
          to="/leads"
          className={`text-sm text-gray-500 hover:underline dark:text-gray-400`}
        >
          ← Leads
        </Link>
        <h1 className={`flex-1 ${ui.pageTitle}`}>{lead.clientName}</h1>
        <StatusBadge status={lead.status} />
        <PriorityBadge priority={lead.priority} />
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className={ui.btnSecondary}
        >
          {editing ? 'Cancel edit' : 'Edit'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={deleteMutation.isPending}
          className={ui.btnDanger}
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>

      {editing ? (
        <section className={ui.card}>
          <h2 className={`mb-3 ${ui.sectionTitle}`}>Edit lead</h2>
          <LeadForm
            initial={lead}
            submitLabel="Save changes"
            onSubmit={(payload) => updateMutation.mutateAsync(payload)}
          />
        </section>
      ) : (
        <section className={ui.card}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DetailRow label="Company" value={lead.company ?? '—'} />
            <DetailRow label="Project" value={lead.project ?? '—'} />
            <DetailRow label="Budget" value={formatBudget(lead)} />
            <DetailRow label="Deadline" value={formatDate(lead.deadline)} />
            <DetailRow label="Next follow-up" value={formatDateTime(lead.nextFollowUp)} />
            <DetailRow label="Created" value={formatDateTime(lead.createdAt)} />
          </dl>
          {lead.description && (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className={ui.overline}>Description</p>
              <p className={`mt-1 whitespace-pre-wrap ${ui.bodyText}`}>{lead.description}</p>
            </div>
          )}
        </section>
      )}

      <FollowUpCard leadId={lead.id} />

      <ProposalCard leadId={lead.id} />

      <ConversationPanel leadId={lead.id} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete lead?"
        danger
        busy={deleteMutation.isPending}
        confirmLabel="Delete"
        message={
          <>
            <span>
              “{lead.clientName}” and its conversations, messages, and proposals will be
              removed permanently.
            </span>
          </>
        }
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
