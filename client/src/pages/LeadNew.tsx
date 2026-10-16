import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createLead } from '../api/leads';
import { LeadForm } from '../components/LeadForm';
import { useToast } from '../components/Toast';
import { ui } from '../lib/ui';
import type { LeadPayload } from '../types';

export function LeadNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const createMutation = useMutation({
    mutationFn: (payload: LeadPayload) => createLead(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      notify('Lead created.', 'success');
      navigate(`/leads/${data.lead.id}`, { replace: true });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className={ui.pageTitle}>New lead</h1>
      <section className={ui.card}>
        <LeadForm
          submitLabel="Create lead"
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
        />
      </section>
    </div>
  );
}
