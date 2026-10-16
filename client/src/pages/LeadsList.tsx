import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchLeads, type LeadFilters } from '../api/leads';
import { PriorityBadge, StatusBadge } from '../components/badges';
import { SkeletonTable } from '../components/Skeleton';
import { FOCUS_SEARCH_EVENT } from '../components/Shortcuts';
import { formatDate, formatBudget } from '../lib/format';
import { isActive, isPotentialDeal } from '../lib/stats';
import { ui } from '../lib/ui';
import type { Lead, LeadStatus, Priority } from '../types';

type FilterKey = 'all' | 'followups' | 'active' | 'potential' | 'converted' | 'lost';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'active', label: 'Active' },
  { key: 'potential', label: 'Potential Deals' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'interested', label: 'Interested' },
  { value: 'proposal_sent', label: 'Proposal sent' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'converted', label: 'Converted' },
  { value: 'lost', label: 'Lost' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const FOLLOW_UP_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
] as const;

function matchesFilter(lead: Lead, filter: FilterKey): boolean {
  switch (filter) {
    case 'followups':
      return lead.nextFollowUp != null;
    case 'active':
      return isActive(lead);
    case 'potential':
      return isPotentialDeal(lead);
    case 'converted':
      return lead.status === 'converted';
    case 'lost':
      return lead.status === 'lost';
    default:
      return true;
  }
}

export function LeadsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = (searchParams.get('filter') as FilterKey) || 'all';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<'' | LeadStatus>('');
  const [priority, setPriority] = useState<'' | Priority>('');
  const [followUp, setFollowUp] = useState<'' | 'today' | 'overdue' | 'upcoming'>('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // The global "/" shortcut announces itself; focus the search box here.
  useEffect(() => {
    function focusSearch() {
      searchRef.current?.focus();
      searchRef.current?.select();
    }
    window.addEventListener(FOCUS_SEARCH_EVENT, focusSearch);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focusSearch);
  }, []);

  const serverFilters: LeadFilters = {
    q: debouncedSearch || undefined,
    status: status || undefined,
    priority: priority || undefined,
    followUp: followUp || undefined,
  };
  const hasServerFilters =
    Boolean(debouncedSearch) || Boolean(status) || Boolean(priority) || Boolean(followUp);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['leads', serverFilters],
    queryFn: () => fetchLeads(serverFilters),
  });

  const leads = (data?.leads ?? []).filter((lead) => matchesFilter(lead, filter));

  function clearServerFilters() {
    setSearch('');
    setDebouncedSearch('');
    setStatus('');
    setPriority('');
    setFollowUp('');
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className={ui.pageTitle}>Leads</h1>
        <Link to="/leads/new" className={ui.btnPrimary}>
          + New Lead
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients, companies, projects…  (press /)"
          aria-label="Search leads"
          className={`${ui.input} min-w-56 sm:w-72 sm:min-w-0`}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | LeadStatus)}
          aria-label="Filter by status"
          className={ui.select}
        >
          <option value="">Status: all</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as '' | Priority)}
          aria-label="Filter by priority"
          className={ui.select}
        >
          <option value="">Priority: all</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value as '' | 'today' | 'overdue' | 'upcoming')}
          aria-label="Filter by follow-up"
          className={ui.select}
        >
          <option value="">Follow-up: all</option>
          {FOLLOW_UP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {hasServerFilters && (
          <button
            type="button"
            onClick={clearServerFilters}
            className={ui.btnSecondaryTight}
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSearchParams(key === 'all' ? {} : { filter: key })}
            className={filter === key ? ui.chipActive : ui.chipIdle}
          >
            {label}
          </button>
        ))}
      </div>

      {isError && (
        <div className={ui.inputError} role="alert">
          <p>Could not load leads.</p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-2 font-medium underline disabled:opacity-50"
          >
            {isFetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      {isLoading && <SkeletonTable rows={6} />}

      {!isLoading && !isError && leads.length === 0 && (
        <p className={ui.empty}>
          {hasServerFilters ? 'No leads match these filters.' : 'No leads in this view.'}
        </p>
      )}

      {!isLoading && leads.length > 0 && (
        <div className={ui.bareCard}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Priority</th>
                  <th className="hidden px-4 py-3 md:table-cell">Budget</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Deadline</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Follow-up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/leads/${lead.id}`}
                        className="font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        {lead.clientName}
                      </Link>
                      {lead.company && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {lead.company}
                        </p>
                      )}
                    </td>
                    <td className={`hidden px-4 py-3 sm:table-cell ${ui.muted}`}>
                      {lead.project ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <PriorityBadge priority={lead.priority} />
                    </td>
                    <td className={`hidden px-4 py-3 md:table-cell ${ui.muted}`}>
                      {formatBudget(lead)}
                    </td>
                    <td className={`hidden px-4 py-3 lg:table-cell ${ui.muted}`}>
                      {formatDate(lead.deadline)}
                    </td>
                    <td className={`hidden px-4 py-3 lg:table-cell ${ui.muted}`}>
                      {formatDate(lead.nextFollowUp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
