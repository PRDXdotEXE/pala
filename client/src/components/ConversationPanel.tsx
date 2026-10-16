import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createConversation,
  fetchConversations,
  fetchMessages,
  postMessage,
} from '../api/conversations';
import type { MessageRole } from '../types';
import { RoleBadge } from './badges';
import { Skeleton } from './Skeleton';
import { formatDateTime } from '../lib/format';
import { ui } from '../lib/ui';

const inputClass = ui.input;

export function ConversationPanel({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<MessageRole>('client');
  const [content, setContent] = useState('');

  const conversationsQuery = useQuery({
    queryKey: ['conversations', leadId],
    queryFn: () => fetchConversations(leadId),
  });

  const conversations = conversationsQuery.data?.conversations ?? [];

  useEffect(() => {
    if (conversations.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) =>
      current && conversations.some((c) => c.id === current)
        ? current
        : conversations[conversations.length - 1].id,
    );
  }, [conversations]);

  const messagesQuery = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: () => fetchMessages(selectedId as string),
    enabled: selectedId != null,
  });

  const createMutation = useMutation({
    mutationFn: () => createConversation(leadId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', leadId] });
      setSelectedId(data.conversation.id);
    },
  });

  const postMutation = useMutation({
    mutationFn: () => postMessage(selectedId as string, { role, content: content.trim() }),
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', leadId] });
    },
  });

  function handlePost(event: FormEvent) {
    event.preventDefault();
    if (selectedId == null || content.trim() === '') return;
    postMutation.mutate();
  }

  if (conversationsQuery.isLoading) {
    return (
      <section className={ui.card} role="status" aria-live="polite">
        <span className="sr-only">Loading conversations…</span>
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-24 w-full" />
      </section>
    );
  }

  if (conversationsQuery.isError) {
    return (
      <section className={ui.card}>
        <h2 className={`mb-3 ${ui.sectionTitle}`}>Conversations</h2>
        <p className={ui.error}>Could not load conversations.</p>
        <button
          type="button"
          onClick={() => conversationsQuery.refetch()}
          className={`mt-3 ${ui.btnSecondary}`}
        >
          Try again
        </button>
      </section>
    );
  }

  if (conversations.length === 0) {
    return (
      <section className={ui.card}>
        <h2 className={`mb-3 ${ui.sectionTitle}`}>Conversations</h2>
        <p className={ui.muted}>
          No conversations yet. Create one, then paste the client conversation — it stays
          on your machine.
        </p>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className={`mt-3 ${ui.btnPrimary}`}
        >
          {createMutation.isPending ? 'Creating…' : '+ New conversation'}
        </button>
      </section>
    );
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  const messages = messagesQuery.data?.messages ?? [];

  return (
    <section className={ui.card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={ui.sectionTitle}>Conversations</h2>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className={ui.btnSecondaryTight}
        >
          {createMutation.isPending ? 'Creating…' : '+ New conversation'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {conversations.map((conversation, index) => (
          <button
            key={conversation.id}
            type="button"
            onClick={() => setSelectedId(conversation.id)}
            className={
              conversation.id === selectedId
                ? ui.chipActive
                : ui.chipIdle
            }
          >
            Conversation {index + 1} · {conversation.messages.length} msg
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {messagesQuery.isLoading && <Skeleton className="h-20 w-full" />}
        {!messagesQuery.isLoading && messages.length === 0 && (
          <p className={ui.muted}>
            No messages in this conversation yet. Paste the conversation below.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-lg border p-3 ${
              message.role === 'user'
                ? 'ml-auto border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                : message.role === 'assistant'
                  ? 'border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <RoleBadge role={message.role} />
              <span className={ui.hint}>
                {formatDateTime(message.createdAt)}
              </span>
            </div>
            <p className={`whitespace-pre-wrap ${ui.bodyText}`}>{message.content}</p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handlePost}
        className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800"
      >
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="msg-role">
            Add message as
          </label>
          <select
            id="msg-role"
            className={ui.selectTight}
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
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            selected
              ? 'Paste a client message or conversation…\n\nClient:\nHi, I own a restaurant in Pokhara. I need a modern website. Budget is around 40k.'
              : 'Create a conversation first.'
          }
          disabled={selectedId == null}
        />
        {postMutation.isError && (
          <p className={ui.error}>
            {postMutation.error instanceof Error
              ? postMutation.error.message
              : 'Failed to save message'}
          </p>
        )}
        <button
          type="submit"
          disabled={postMutation.isPending || selectedId == null || content.trim() === ''}
          className={ui.btnPrimary}
        >
          {postMutation.isPending ? 'Saving…' : 'Add message'}
        </button>
      </form>
    </section>
  );
}
