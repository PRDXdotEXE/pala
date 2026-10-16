import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createLead } from '../api/leads';
import { LeadForm } from '../components/LeadForm';
import type { LeadPayload } from '../types';

export function LeadNew() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: LeadPayload) => createLead(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate(`/leads/${data.lead.id}`, { replace: true });
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold text-gray-900">New lead</h1>
      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <LeadForm
          submitLabel="Create lead"
          onSubmit={(payload) => createMutation.mutateAsync(payload)}
        />
      </section>
    </div>
  );
}
