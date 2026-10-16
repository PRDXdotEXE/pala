import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchLeads } from '../api/leads';
import { PriorityBadge, StatusBadge } from '../components/badges';
import { formatDate, formatBudget } from '../lib/format';
import { isActive, isPotentialDeal } from '../lib/stats';
import type { Lead } from '../types';

type FilterKey = 'all' | 'followups' | 'active' | 'potential' | 'converted' | 'lost';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'followups', label: 'Follow-ups' },
  { key: 'active', label: 'Active' },
  { key: 'potential', label: 'Potential Deals' },
  { key: 'converted', label: 'Converted' },
  { key: 'lost', label: 'Lost' },
];

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

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  });

  const leads = (data?.leads ?? []).filter((lead) => matchesFilter(lead, filter));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
        <Link
          to="/leads/new"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + New Lead
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSearchParams(key === 'all' ? {} : { filter: key })}
            className={
              filter === key
                ? 'rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white'
                : 'rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}

      {!isLoading && leads.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          No leads in this view.
        </p>
      )}

      {leads.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
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
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {lead.clientName}
                    </Link>
                    {lead.company && (
                      <p className="text-xs text-gray-400">{lead.company}</p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                    {lead.project ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <PriorityBadge priority={lead.priority} />
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 md:table-cell">
                    {formatBudget(lead)}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                    {formatDate(lead.deadline)}
                  </td>
                  <td className="hidden px-4 py-3 text-gray-600 lg:table-cell">
                    {formatDate(lead.nextFollowUp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
