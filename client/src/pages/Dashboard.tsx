import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchLeads } from '../api/leads';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/badges';
import { formatMoney, isToday } from '../lib/format';
import { computeStats } from '../lib/stats';

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  });

  const leads = data?.leads ?? [];
  const stats = computeStats(leads);
  const todayFollowUps = leads.filter((lead) => isToday(lead.nextFollowUp));

  const potential = stats.potentialByCurrency
    .map(({ currency, amount }) => formatMoney(amount, currency))
    .join(' · ');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      {isLoading && <p className="text-sm text-gray-500">Loading leads…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Leads" value={stats.total} />
        <StatCard label="Active Leads" value={stats.active} />
        <StatCard label="Follow-ups Today" value={stats.followUpsToday} />
        <StatCard label="Potential Revenue" value={potential || '—'} />
        <StatCard label="Converted" value={stats.converted} />
        <StatCard label="Lost" value={stats.lost} />
      </div>

      {stats.followUpsToday > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">Due today</h2>
          <ul className="space-y-1">
            {todayFollowUps.map((lead) => (
              <li key={lead.id} className="text-sm text-amber-900">
                <Link className="font-medium underline" to={`/leads/${lead.id}`}>
                  {lead.clientName}
                </Link>
                {lead.project ? ` — ${lead.project}` : ''}{' '}
                <StatusBadge status={lead.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isLoading && leads.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No leads yet.</p>
          <Link
            to="/leads/new"
            className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create your first lead
          </Link>
        </div>
      )}
    </div>
  );
}
