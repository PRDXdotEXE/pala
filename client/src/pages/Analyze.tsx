import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeConversation } from '../api/ai';
import { createLead } from '../api/leads';
import { LeadForm } from '../components/LeadForm';
import { useToast } from '../components/Toast';
import { PriorityBadge, StatusBadge } from '../components/badges';
import { extractionToDraft, isIsoDate } from '../lib/extraction';
import { formatBudgetRange, formatDate } from '../lib/format';
import { ui } from '../lib/ui';
import type { LeadExtraction, LeadPayload } from '../types';

const NOT_STATED = (
  <span className="text-gray-400 dark:text-gray-500">not stated</span>
);

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className={ui.overline}>{label}</dt>
      <dd className={ui.bodyText}>{value}</dd>
    </div>
  );
}

function ExtractionBudget({ extraction }: { extraction: LeadExtraction }) {
  const { budgetMin, budgetMax, currency } = extraction;
  if (budgetMin == null && budgetMax == null) return <>{NOT_STATED}</>;
  if (!currency) {
    const parts = [budgetMin, budgetMax].filter((v): v is number => v != null);
    return (
      <>
        {parts.join(' – ')} <span className={ui.hint}>(currency not stated)</span>
      </>
    );
  }
  return <>{formatBudgetRange(budgetMin, budgetMax, currency)}</>;
}

export function Analyze() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const [conversation, setConversation] = useState('');
  const [result, setResult] = useState<LeadExtraction | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const analyzeMutation = useMutation({
    mutationFn: (text: string) => analyzeConversation(text),
    onSuccess: (data) => {
      setResult(data.lead);
      setWarning(data.warning ?? null);
      setEditing(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: LeadPayload) => createLead(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      notify('Lead created.', 'success');
      navigate(`/leads/${data.lead.id}`, { replace: true });
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : 'Could not create the lead.',
        'error',
      ),
  });

  function handleAnalyze(event: FormEvent) {
    event.preventDefault();
    const text = conversation.trim();
    if (text === '') return;
    analyzeMutation.mutate(text);
  }

  function handleDirectCreate() {
    if (!result) return;
    const draft = extractionToDraft(result);
    if (draft.clientName.trim() === '') return;
    createMutation.mutate(draft);
  }

  const draft = result ? extractionToDraft(result) : null;
  const missingClient = draft != null && draft.clientName.trim() === '';

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className={ui.pageTitle}>Analyze a conversation</h1>

      <form
        onSubmit={handleAnalyze}
        className={ui.card}
      >
        <label className={ui.label} htmlFor="conversation">
          Paste Client Conversation
        </label>
        <textarea
          id="conversation"
          rows={8}
          className={`mt-2 ${ui.input}`}
          value={conversation}
          onChange={(e) => setConversation(e.target.value)}
          placeholder={'Hi, I run ABC Restaurant. I need a website — budget NPR 40,000, before Dashain.'}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={analyzeMutation.isPending || conversation.trim() === ''}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze'}
          </button>
          <span className={ui.hint}>
            Runs on your local model. The first analysis can take ~45 s while it loads; after that a
            few seconds.
          </span>
        </div>

        {analyzeMutation.isError && (
          <p className={`mt-3 ${ui.inputError}`}>
            {analyzeMutation.error instanceof Error
              ? analyzeMutation.error.message
              : 'Analysis failed'}
          </p>
        )}
      </form>

      {result && draft && !editing && (
        <section className={ui.card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={ui.sectionTitle}>AI Analysis</h2>
            <span className={ui.hint}>Nothing is saved until you create the lead.</span>
          </div>

          {warning && (
            <p
              role="alert"
              className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
            >
              {warning}
            </p>
          )}

          <dl className="grid gap-4 sm:grid-cols-2">
            <Row label="Client" value={result.clientName ?? NOT_STATED} />
            <Row label="Company" value={result.company ?? NOT_STATED} />
            <Row label="Project" value={result.project ?? NOT_STATED} />
            <Row label="Budget" value={<ExtractionBudget extraction={result} />} />
            <Row
              label="Deadline"
              value={
                result.deadline == null ? (
                  NOT_STATED
                ) : isIsoDate(result.deadline) ? (
                  formatDate(result.deadline)
                ) : (
                  <>
                    {result.deadline}{' '}
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      (words, not a date — set a real date when editing)
                    </span>
                  </>
                )
              }
            />
            <Row
              label="Priority"
              value={result.priority ? <PriorityBadge priority={result.priority} /> : NOT_STATED}
            />
            <Row
              label="Status"
              value={result.status ? <StatusBadge status={result.status} /> : NOT_STATED}
            />
            <Row label="Next action" value={result.nextAction ?? NOT_STATED} />
            <Row
              className="sm:col-span-2"
              label="Description"
              value={
                result.description ? (
                  <span className="whitespace-pre-wrap">{result.description}</span>
                ) : (
                  NOT_STATED
                )
              }
            />
          </dl>

          {(result.status == null || result.priority == null || result.currency == null) && (
            <p className={`mt-3 ${ui.hint}`}>
              Blank fields fall back to the usual defaults when you create the lead (status “new”,
              priority “medium”, currency “USD”).
            </p>
          )}

          {createMutation.isError && (
            <p className={`mt-3 ${ui.inputError}`}>
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : 'Create failed'}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className={ui.btnSecondary}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDirectCreate}
              disabled={missingClient || createMutation.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating…' : 'Create Lead'}
            </button>
            {missingClient && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                No client name found — add one with Edit first.
              </span>
            )}
          </div>
        </section>
      )}

      {result && draft && editing && (
        <section className={ui.card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={ui.sectionTitle}>Review and edit</h2>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Back to summary
            </button>
          </div>

          <div className={`mb-3 space-y-1 ${ui.hint}`}>
            {result.deadline != null && !isIsoDate(result.deadline) && (
              <p>
                AI read the deadline as “{result.deadline}”. A lead deadline must be a date — pick
                one below or leave it blank.
              </p>
            )}
            {result.nextAction && <p>Suggested next step: {result.nextAction} (not saved on the lead).</p>}
          </div>

          <LeadForm
            initial={draft}
            submitLabel="Create lead"
            onSubmit={(payload) => createMutation.mutateAsync(payload)}
          />
        </section>
      )}
    </div>
  );
}
