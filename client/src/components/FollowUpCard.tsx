import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { generateFollowUp } from '../api/ai';
import { useToast } from './Toast';
import { ui } from '../lib/ui';

export function FollowUpCard({ leadId }: { leadId: string }) {
  const { notify } = useToast();
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => generateFollowUp(leadId),
    onSuccess: (data) => {
      setMessage(data.message);
      setCopied(false);
      notify('Follow-up drafted.', 'success');
    },
    onError: (error) =>
      notify(
        error instanceof Error ? error.message : 'Could not generate a follow-up.',
        'error',
      ),
  });

  useEffect(() => {
    setMessage('');
    setCopied(false);
  }, [leadId]);

  async function copy() {
    try {
      await navigator.clipboard?.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context): leave the text selectable.
      notify('Copy failed — select the text and copy manually.', 'error');
    }
  }

  return (
    <section className={ui.card}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={ui.sectionTitle}>AI follow-up</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className={ui.btnPrimary}
          >
            {mutation.isPending
              ? 'Generating…'
              : message
                ? 'Regenerate'
                : 'Generate follow-up'}
          </button>
          {message && (
            <button
              type="button"
              onClick={copy}
              className={ui.btnSecondary}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {mutation.isError && (
        <p className={`mb-3 ${ui.error}`}>
          {mutation.error instanceof Error ? mutation.error.message : 'Generation failed'}
        </p>
      )}

      {message ? (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          aria-label="Follow-up message"
          className={`${ui.input} p-3 leading-relaxed`}
        />
      ) : (
        <p className={ui.muted}>
          Generate a follow-up from this lead's details and conversation history.
        </p>
      )}

      {message && (
        <p className={`mt-2 ${ui.hint}`}>
          Review and edit before sending — nothing is sent automatically.
        </p>
      )}
    </section>
  );
}
