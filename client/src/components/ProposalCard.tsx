import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { generateProposal } from '../api/ai';
import { deleteProposal, fetchProposals, saveProposal } from '../api/leads';
import { formatDateTime } from '../lib/format';
import { ui } from '../lib/ui';
import { ConfirmDialog } from './ConfirmDialog';
import { useToast } from './Toast';
import type { Proposal, SavedProposal } from '../types';

const EMPTY_DRAFT_NOTE = 'Generate a proposal draft from this lead. Review and edit it before saving.';

function listToText(items: string[]): string {
  return items.join('\n');
}

function textToList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ProposalCard({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [requirements, setRequirements] = useState('');
  const [draft, setDraft] = useState<Proposal | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedProposal | null>(null);

  const proposalsQuery = useQuery({
    queryKey: ['proposals', leadId],
    queryFn: () => fetchProposals(leadId),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateProposal(leadId, requirements.trim() || undefined),
    onSuccess: (data) => {
      setDraft(data.proposal);
      setFormError(null);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (proposal: Proposal) => saveProposal(leadId, proposal),
    onSuccess: () => {
      setDraft(null);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['proposals', leadId] });
      notify('Proposal saved.', 'success');
    },
    onError: (error) =>
      notify(error instanceof Error ? error.message : 'Could not save the proposal.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (proposalId: string) => deleteProposal(leadId, proposalId),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ['proposals', leadId] });
      notify('Proposal deleted.', 'success');
    },
    onError: (error) => {
      setPendingDelete(null);
      notify(
        error instanceof Error ? error.message : 'Could not delete the proposal.',
        'error',
      );
    },
  });

  function update<K extends keyof Proposal>(key: K, value: Proposal[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function save() {
    if (!draft) return;
    const cleaned: Proposal = {
      ...draft,
      scope: textToList(listToText(draft.scope)),
      deliverables: textToList(listToText(draft.deliverables)),
      timeline: textToList(listToText(draft.timeline)),
    };
    if (cleaned.scope.length === 0 || cleaned.deliverables.length === 0) {
      setFormError('Scope and deliverables each need at least one item.');
      return;
    }
    setFormError(null);
    saveMutation.mutate(cleaned);
  }

  const saved = proposalsQuery.data?.proposals ?? [];

  return (
    <section className={ui.card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>AI proposal</h2>
        <button
          type="button"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className={ui.btnPrimary}
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate proposal'}
        </button>
      </div>

      <label className="mb-3 block">
        <span className={`mb-1 block ${ui.overline}`}>Extra requirements (optional)</span>
        <input
          type="text"
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="e.g. Include a Nepali payment gateway"
          className={ui.input}
        />
      </label>

      {generateMutation.isError && (
        <p className={`mb-3 ${ui.error}`}>
          {generateMutation.error instanceof Error
            ? generateMutation.error.message
            : 'Generation failed'}
        </p>
      )}

      {draft ? (
        <div className="space-y-3 rounded border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900 dark:bg-blue-950/40">
          <div>
            <label className={`mb-1 block ${ui.overline}`} htmlFor="proposal-title">
              Title
            </label>
            <input
              id="proposal-title"
              type="text"
              value={draft.title}
              onChange={(e) => update('title', e.target.value)}
              className={ui.input}
            />
          </div>

          <div>
            <label
              className={`mb-1 block ${ui.overline}`}
              htmlFor="proposal-overview"
            >
              Project overview
            </label>
            <textarea
              id="proposal-overview"
              value={draft.projectOverview}
              onChange={(e) => update('projectOverview', e.target.value)}
              rows={3}
              className={`${ui.input} p-2`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={`mb-1 block ${ui.overline}`} htmlFor="proposal-scope">
                Scope (one per line)
              </label>
              <textarea
                id="proposal-scope"
                value={listToText(draft.scope)}
                onChange={(e) => update('scope', e.target.value.split('\n'))}
                rows={5}
                className={`${ui.input} p-2`}
              />
            </div>
            <div>
              <label
                className={`mb-1 block ${ui.overline}`}
                htmlFor="proposal-deliverables"
              >
                Deliverables (one per line)
              </label>
              <textarea
                id="proposal-deliverables"
                value={listToText(draft.deliverables)}
                onChange={(e) => update('deliverables', e.target.value.split('\n'))}
                rows={5}
                className={`${ui.input} p-2`}
              />
            </div>
            <div>
              <label className={`mb-1 block ${ui.overline}`} htmlFor="proposal-timeline">
                Timeline (one per line)
              </label>
              <textarea
                id="proposal-timeline"
                value={listToText(draft.timeline)}
                onChange={(e) => update('timeline', e.target.value.split('\n'))}
                rows={5}
                className={`${ui.input} p-2`}
              />
            </div>
          </div>

          <div>
            <label className={`mb-1 block ${ui.overline}`} htmlFor="proposal-pricing">
              Pricing
            </label>
            <textarea
              id="proposal-pricing"
              value={draft.pricing}
              onChange={(e) => update('pricing', e.target.value)}
              rows={2}
              className={`${ui.input} p-2`}
            />
          </div>

          <div>
            <label className={`mb-1 block ${ui.overline}`} htmlFor="proposal-next">
              Next steps
            </label>
            <textarea
              id="proposal-next"
              value={draft.nextSteps}
              onChange={(e) => update('nextSteps', e.target.value)}
              rows={2}
              className={`${ui.input} p-2`}
            />
          </div>

          {formError && <p className={ui.error}>{formError}</p>}
          {saveMutation.isError && (
            <p className={ui.error}>
              {saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed'}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saveMutation.isPending}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save proposal'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(null);
                setFormError(null);
                generateMutation.reset();
              }}
              className={ui.btnSecondary}
            >
              Discard
            </button>
          </div>
          <p className={ui.hint}>
            This is a draft until you save it — the client never sees anything automatically.
          </p>
        </div>
      ) : (
        !generateMutation.isError && (
          <p className={ui.muted}>{EMPTY_DRAFT_NOTE}</p>
        )
      )}

      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
        <h3 className={`mb-2 ${ui.overline}`}>Saved proposals</h3>
        {proposalsQuery.isLoading && <p className={ui.muted}>Loading…</p>}
        {proposalsQuery.isError && (
          <p className={ui.error}>Failed to load proposals.</p>
        )}
        {proposalsQuery.isSuccess && saved.length === 0 && (
          <p className={ui.muted}>None saved yet.</p>
        )}
        {saved.length > 0 && (
          <ul className="space-y-2">
            {saved.map((proposal) => (
              <li
                key={proposal.id}
                className="flex items-start justify-between gap-3 rounded border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/60"
              >
                <div className="min-w-0">
                  <p className={`truncate ${ui.bodyText} font-medium`}>{proposal.title}</p>
                  <p className={ui.hint}>{formatDateTime(proposal.createdAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPendingDelete(proposal)}
                  disabled={deleteMutation.isPending}
                  className="shrink-0 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete proposal?"
        danger
        busy={deleteMutation.isPending}
        confirmLabel="Delete"
        message={
          <>
            <span>“{pendingDelete?.title}” will be removed permanently.</span>
          </>
        }
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
