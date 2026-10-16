import type { LeadStatus, MessageRole, Priority } from '../types';

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-gray-100 text-gray-700',
  contacted: 'bg-blue-100 text-blue-700',
  interested: 'bg-violet-100 text-violet-700',
  proposal_sent: 'bg-amber-100 text-amber-800',
  negotiating: 'bg-orange-100 text-orange-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

const ROLE_STYLES: Record<MessageRole, string> = {
  client: 'bg-blue-100 text-blue-700',
  user: 'bg-green-100 text-green-700',
  assistant: 'bg-violet-100 text-violet-700',
};

const ROLE_LABELS: Record<MessageRole, string> = {
  client: 'Client',
  user: 'You',
  assistant: 'Assistant',
};

function badge(classes: string, label: string) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus }) {
  return badge(STATUS_STYLES[status], status.replace('_', ' '));
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return badge(PRIORITY_STYLES[priority], priority);
}

export function RoleBadge({ role }: { role: MessageRole }) {
  return badge(ROLE_STYLES[role], ROLE_LABELS[role]);
}
