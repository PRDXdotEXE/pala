import { describe, expect, it } from 'vitest';
import { followUpBucket, groupFollowUps } from './follow-ups';
import type { Lead } from '../types';

const NOW = new Date(2026, 9, 16, 14, 30); // 2026-10-16 14:30 local

function lead(id: string, nextFollowUp: string | null): Lead {
  return {
    id,
    userId: 'u1',
    clientName: `Client ${id}`,
    company: null,
    project: null,
    description: null,
    budgetMin: null,
    budgetMax: null,
    currency: 'USD',
    status: 'new',
    priority: 'medium',
    deadline: null,
    nextFollowUp,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

describe('followUpBucket', () => {
  it('returns null for unscheduled or invalid dates', () => {
    expect(followUpBucket(null, NOW)).toBeNull();
    expect(followUpBucket(undefined, NOW)).toBeNull();
    expect(followUpBucket('not-a-date', NOW)).toBeNull();
  });

  it('buckets by local calendar day', () => {
    expect(followUpBucket(new Date(2026, 9, 15, 9, 0).toISOString(), NOW)).toBe('overdue');
    expect(followUpBucket(new Date(2026, 9, 16, 0, 1).toISOString(), NOW)).toBe('today');
    expect(followUpBucket(new Date(2026, 9, 16, 23, 59).toISOString(), NOW)).toBe('today');
    expect(followUpBucket(new Date(2026, 9, 17, 0, 0).toISOString(), NOW)).toBe('upcoming');
  });
});

describe('groupFollowUps', () => {
  it('splits and sorts leads into three groups', () => {
    const leads = [
      lead('c', new Date(2026, 9, 20).toISOString()),
      lead('a', new Date(2026, 9, 14).toISOString()),
      lead('b', new Date(2026, 9, 16, 9, 0).toISOString()),
      lead('d', null),
      lead('e', new Date(2026, 9, 12).toISOString()),
    ];

    const groups = groupFollowUps(leads, NOW);
    expect(groups.overdue.map((l) => l.id)).toEqual(['e', 'a']);
    expect(groups.today.map((l) => l.id)).toEqual(['b']);
    expect(groups.upcoming.map((l) => l.id)).toEqual(['c']);
  });

  it('returns empty groups when nothing is scheduled', () => {
    const groups = groupFollowUps([lead('a', null)], NOW);
    expect(groups.overdue).toEqual([]);
    expect(groups.today).toEqual([]);
    expect(groups.upcoming).toEqual([]);
  });
});
