import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { fetchConversations, postMessage } from '../api/conversations';
import type { MessageRole } from '../types';
import { RoleBadge } from './badges';
import { formatDateTime } from '../lib/format';

const inputClass =
  'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function ConversationPanel({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<MessageRole>('client');
  const [content, setContent] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', leadId],
    queryFn: () => fetchConversations(leadId),
  });

  const postMutation = useMutation({
    mutationFn: () => postMessage(leadId, { role, content: content.trim() }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['conversations', leadId] });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (content.trim() === '') return;
    postMutation.mutate();
  }

  const conversations = data?.conversations ?? [];
  const hasMessages = conversations.some((c) => c.messages.length > 0);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Conversations</h2>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}

      {!isLoading && !hasMessages && (
        <p className="text-sm text-gray-500">
          No messages yet. Paste a client message below to start tracking the
          conversation.
        </p>
      )}

      <div className="space-y-3">
        {conversations.map((conversation) =>
          conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-lg border p-3 ${
                message.role === 'user'
                  ? 'ml-auto border-green-200 bg-green-50'
                  : message.role === 'assistant'
                    ? 'border-violet-200 bg-violet-50'
                    : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <RoleBadge role={message.role} />
                <span className="text-xs text-gray-400">
                  {formatDateTime(message.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-800">
                {message.content}
              </p>
            </div>
          )),
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700" htmlFor="msg-role">
            Add message as
          </label>
          <select
            id="msg-role"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as MessageRole)}
          >
            <option value="client">Client</option>
            <option value="user">You</option>
            <option value="assistant">Assistant</option>
          </select>
        </div>
        <textarea
          className={inputClass}
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste a message or write a note…"
        />
        {postMutation.isError && (
          <p className="text-sm text-red-600">
            {postMutation.error instanceof Error
              ? postMutation.error.message
              : 'Failed to save message'}
          </p>
        )}
        <button
          type="submit"
          disabled={postMutation.isPending || content.trim() === ''}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {postMutation.isPending ? 'Saving…' : 'Add message'}
        </button>
      </form>
    </section>
  );
}
