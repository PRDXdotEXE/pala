import type { Lead } from '../types';

export type FollowUpBucket = 'overdue' | 'today' | 'upcoming';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfToday(now: Date = new Date()): Date {
  return startOfDay(now);
}

/** Bucket a single nextFollowUp date; null when unscheduled or unparseable. */
export function followUpBucket(
  value: string | null | undefined,
  now: Date = new Date(),
): FollowUpBucket | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = startOfDay(now);
  const day = startOfDay(date);
  if (day.getTime() < today.getTime()) return 'overdue';
  if (day.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function byDateAsc(a: Lead, b: Lead): number {
  return new Date(a.nextFollowUp ?? 0).getTime() - new Date(b.nextFollowUp ?? 0).getTime();
}

/** Group scheduled leads into overdue / today / upcoming; each group sorted by date. */
export function groupFollowUps(
  leads: Lead[],
  now: Date = new Date(),
): Record<FollowUpBucket, Lead[]> {
  const groups: Record<FollowUpBucket, Lead[]> = { overdue: [], today: [], upcoming: [] };
  for (const lead of leads) {
    const bucket = followUpBucket(lead.nextFollowUp, now);
    if (bucket) groups[bucket].push(lead);
  }
  groups.overdue.sort(byDateAsc);
  groups.today.sort(byDateAsc);
  groups.upcoming.sort(byDateAsc);
  return groups;
}
