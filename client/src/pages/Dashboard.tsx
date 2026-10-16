import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchLeads } from '../api/leads';
import { Skeleton, SkeletonStats } from '../components/Skeleton';
import { StatCard } from '../components/StatCard';
import { groupFollowUps, type FollowUpBucket } from '../lib/follow-ups';
import { formatDateTime, formatMoney } from '../lib/format';
import { computeStats } from '../lib/stats';
import { ui } from '../lib/ui';

const BUCKET_STYLES: Record<FollowUpBucket, { title: string; classes: string }> = {
  overdue: {
    title: 'Overdue',
    classes:
      'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200',
  },
  today: {
    title: 'Due today',
    classes:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
  },
  upcoming: {
    title: 'Upcoming',
    classes:
      'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
  },
};

function FollowUpGroup({
  bucket,
  leads,
}: {
  bucket: FollowUpBucket;
  leads: ReturnType<typeof groupFollowUps>[FollowUpBucket];
}) {
  const style = BUCKET_STYLES[bucket];
  return (
    <div className={`rounded-lg border p-3 ${style.classes}`}>
      <h3 className="mb-2 text-xs font-semibold uppercase">
        {style.title} ({leads.length})
      </h3>
      <ul className="space-y-1.5">
        {leads.map((lead) => (
          <li key={lead.id} className="text-sm">
            <Link className="font-medium underline" to={`/leads/${lead.id}`}>
              {lead.clientName}
            </Link>
            <span className="block text-xs opacity-80">
              {lead.project ? `${lead.project} · ` : ''}
              {formatDateTime(lead.nextFollowUp)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['leads'],
    queryFn: () => fetchLeads(),
  });

  const leads = data?.leads ?? [];
  const stats = computeStats(leads);
  const followUps = groupFollowUps(leads);
  const hasFollowUps =
    followUps.overdue.length > 0 || followUps.today.length > 0 || followUps.upcoming.length > 0;

  const potential = stats.potentialByCurrency
    .map(({ currency, amount }) => formatMoney(amount, currency))
    .join(' · ');

  return (
    <div className="space-y-6">
      <h1 className={ui.pageTitle}>Dashboard</h1>

      {isError && (
        <div className={ui.inputError} role="alert">
          <p>Could not load your leads.</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <SkeletonStats />
        ) : (
          <>
            <StatCard label="Total Leads" value={stats.total} />
            <StatCard label="Active Leads" value={stats.active} />
            <StatCard label="Follow-ups Today" value={stats.followUpsToday} />
            <StatCard label="Potential Revenue" value={potential || '—'} />
            <StatCard label="Converted" value={stats.converted} />
            <StatCard label="Lost" value={stats.lost} />
          </>
        )}
      </div>

      {isLoading && (
        <section className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
        </section>
      )}

      {!isLoading && hasFollowUps && (
        <section>
          <h2 className={`mb-2 ${ui.sectionTitle}`}>Follow-ups</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <FollowUpGroup bucket="overdue" leads={followUps.overdue} />
            <FollowUpGroup bucket="today" leads={followUps.today} />
            <FollowUpGroup bucket="upcoming" leads={followUps.upcoming} />
          </div>
        </section>
      )}

      {!isLoading && !isError && leads.length === 0 && (
        <div className={ui.empty}>
          <p className={ui.muted}>No leads yet.</p>
          <Link
            to="/leads/new"
            className={`mt-3 inline-block ${ui.btnPrimaryLg}`}
          >
            Create your first lead
          </Link>
        </div>
      )}
    </div>
  );
}
