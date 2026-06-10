import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  LogOut,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { checkAdminAccess, fetchAdminComplaints } from '../lib/adminComplaints';
import { categoryLabels, statusLabels } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { AdminComplaint, ComplaintStatus } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';
type DateFilter = 'all' | 'today' | '7days' | '30days' | 'month';

type AccessState = {
  allowed: boolean | null;
  role: 'admin' | 'chairman' | 'staff' | null;
};

type GroupedMetric = {
  name: string;
  total: number;
  pending: number;
  resolved: number;
};

const closedStatuses: ComplaintStatus[] = ['resolved', 'rejected', 'not_related'];
const rangeLabels: Record<DateFilter, string> = {
  all: 'All Time',
  today: 'Today',
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  month: 'This Month',
};

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function getCutoff(filter: DateFilter) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === 'all') return null;
  if (filter === 'today') return now - oneDay;
  if (filter === '7days') return now - 7 * oneDay;
  if (filter === '30days') return now - 30 * oneDay;
  return startOfCurrentMonth();
}

function isInDateRange(dateValue: string, filter: DateFilter) {
  const cutoff = getCutoff(filter);
  if (!cutoff) return true;
  return new Date(dateValue).getTime() >= cutoff;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, diff / (24 * 60 * 60 * 1000));
}

function groupBy(items: AdminComplaint[], getKey: (item: AdminComplaint) => string): GroupedMetric[] {
  const map = new Map<string, GroupedMetric>();

  for (const item of items) {
    const key = getKey(item).trim() || 'Not Assigned';
    const current = map.get(key) ?? { name: key, total: 0, pending: 0, resolved: 0 };
    current.total += 1;

    if (closedStatuses.includes(item.status)) {
      if (item.status === 'resolved') current.resolved += 1;
    } else {
      current.pending += 1;
    }

    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function ChairmanDashboard() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [access, setAccess] = useState<AccessState>({ allowed: null, role: null });
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => isInDateRange(item.created_at, dateFilter));
  }, [complaints, dateFilter]);

  const analytics = useMemo(() => {
    const total = filteredComplaints.length;
    const submitted = filteredComplaints.filter((item) => item.status === 'submitted').length;
    const received = filteredComplaints.filter((item) => item.status === 'received').length;
    const inProgress = filteredComplaints.filter((item) => item.status === 'in_progress').length;
    const resolved = filteredComplaints.filter((item) => item.status === 'resolved').length;
    const rejected = filteredComplaints.filter((item) => item.status === 'rejected').length;
    const notRelated = filteredComplaints.filter((item) => item.status === 'not_related').length;
    const pending = submitted + received + inProgress;
    const urgent = filteredComplaints.filter((item) => item.priority === 'urgent' || item.priority === 'high').length;
    const closed = resolved + rejected + notRelated;
    const resolutionRate = total ? (resolved / total) * 100 : 0;
    const pendingRate = total ? (pending / total) * 100 : 0;
    const resolvedWithDates = filteredComplaints.filter((item) => item.status === 'resolved' && item.resolved_at);
    const averageResolutionDays = resolvedWithDates.length
      ? resolvedWithDates.reduce((sum, item) => sum + daysBetween(item.created_at, item.resolved_at as string), 0) / resolvedWithDates.length
      : 0;

    return {
      total,
      submitted,
      received,
      inProgress,
      resolved,
      rejected,
      notRelated,
      pending,
      urgent,
      closed,
      resolutionRate,
      pendingRate,
      averageResolutionDays,
    };
  }, [filteredComplaints]);

  const calendarStats = useMemo(() => {
    return {
      today: complaints.filter((item) => isInDateRange(item.created_at, 'today')).length,
      week: complaints.filter((item) => isInDateRange(item.created_at, '7days')).length,
      month: complaints.filter((item) => isInDateRange(item.created_at, 'month')).length,
    };
  }, [complaints]);

  const departmentMetrics = useMemo(() => {
    return groupBy(filteredComplaints, (item) => item.assigned_department || categoryLabels[item.category] || item.category).slice(0, 8);
  }, [filteredComplaints]);

  const areaMetrics = useMemo(() => {
    return groupBy(filteredComplaints, (item) => [item.ward, item.area].filter(Boolean).join(' - ') || item.area).slice(0, 8);
  }, [filteredComplaints]);

  const statusMetrics = useMemo(() => {
    return Object.entries(statusLabels).map(([status, label]) => ({
      label,
      status: status as ComplaintStatus,
      total: filteredComplaints.filter((item) => item.status === status).length,
    }));
  }, [filteredComplaints]);

  const longPending = useMemo(() => {
    return filteredComplaints
      .filter((item) => !closedStatuses.includes(item.status))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);
  }, [filteredComplaints]);

  const importantComplaints = useMemo(() => {
    return filteredComplaints
      .filter((item) => (item.priority === 'urgent' || item.priority === 'high') && !closedStatuses.includes(item.status))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [filteredComplaints]);

  const recentlyResolved = useMemo(() => {
    return filteredComplaints
      .filter((item) => item.status === 'resolved')
      .sort((a, b) => new Date(b.resolved_at || b.updated_at).getTime() - new Date(a.resolved_at || a.updated_at).getTime())
      .slice(0, 5);
  }, [filteredComplaints]);

  useEffect(() => {
    async function init() {
      const accessCheck = await checkAdminAccess();

      if (!accessCheck.signedIn) {
        setSessionState('signed-out');
        setLoading(false);
        return;
      }

      setSessionState('signed-in');
      setAccess({ allowed: accessCheck.allowed, role: accessCheck.role });

      if (accessCheck.role === 'admin' || accessCheck.role === 'chairman') {
        await loadComplaints();
      } else {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function loadComplaints() {
    setError('');
    setLoading(true);

    try {
      const rows = await fetchAdminComplaints();
      setComplaints(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load chairman dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  const allowed = access.role === 'admin' || access.role === 'chairman';

  return (
    <>
      <PageHeader
        eyebrow="Chairman Dashboard"
        title="Complaint performance overview"
        description="Monitor public complaints, pending workload, department performance, area-wise issues and recent resolution activity."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === 'checking' ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking chairman dashboard access...
          </div>
        ) : null}

        {sessionState === 'signed-in' && !allowed ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">Chairman Dashboard is available only for accounts assigned as chairman or admin.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/admin" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-800 ring-1 ring-rose-200">
                Back to Admin
              </Link>
              <button onClick={handleLogout} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">
                Logout
              </button>
            </div>
          </div>
        ) : null}

        {allowed ? (
          <>
            <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                  Signed in role: {access.role ?? 'authorized'}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Selected range: {rangeLabels[dateFilter]}. Data is calculated from complaints currently accessible to this account.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Admin List
                </Link>
                <Link
                  to="/admin/reports"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="mr-2 h-4 w-4" /> Reports
                </Link>
                <button
                  onClick={loadComplaints}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(Object.entries(rangeLabels) as Array<[DateFilter, string]>).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setDateFilter(value)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                    dateFilter === value
                      ? 'border-civic-700 bg-civic-700 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error ? <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <SummaryCard icon={<BarChart3 className="h-5 w-5" />} label="Total" value={analytics.total} helper={rangeLabels[dateFilter]} />
              <SummaryCard icon={<Clock3 className="h-5 w-5" />} label="Pending" value={analytics.pending} helper={formatPercent(analytics.pendingRate)} />
              <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="In Progress" value={analytics.inProgress} helper="Active work" />
              <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label="Resolved" value={analytics.resolved} helper={formatPercent(analytics.resolutionRate)} />
              <SummaryCard icon={<AlertTriangle className="h-5 w-5" />} label="High / Urgent" value={analytics.urgent} helper="Needs review" />
              <SummaryCard
                icon={<CalendarDays className="h-5 w-5" />}
                label="Avg Resolve"
                value={analytics.averageResolutionDays ? `${analytics.averageResolutionDays.toFixed(1)}d` : '—'}
                helper="Resolved only"
              />
            </div>

            <div className="mb-6 grid gap-3 lg:grid-cols-3">
              <MiniStat label="Today Complaints" value={calendarStats.today} />
              <MiniStat label="Last 7 Days" value={calendarStats.week} />
              <MiniStat label="This Month" value={calendarStats.month} />
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Panel title="Status overview" description="Current status distribution for selected range.">
                <div className="grid gap-3 sm:grid-cols-2">
                  {statusMetrics.map((item) => (
                    <div key={item.status} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <StatusBadge status={item.status} />
                        <span className="text-xl font-black text-slate-950">{item.total}</span>
                      </div>
                      <ProgressBar value={analytics.total ? (item.total / analytics.total) * 100 : 0} />
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Quick indicators" description="Useful numbers for daily review.">
                <div className="space-y-3">
                  <Indicator label="Closed Complaints" value={analytics.closed} total={analytics.total} />
                  <Indicator label="Resolved Complaints" value={analytics.resolved} total={analytics.total} />
                  <Indicator label="Pending Complaints" value={analytics.pending} total={analytics.total} />
                  <Indicator label="Rejected / Not Related" value={analytics.rejected + analytics.notRelated} total={analytics.total} />
                </div>
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <Panel title="Department wise complaints" description="Shows departments/categories with highest workload.">
                <MetricList metrics={departmentMetrics} emptyText="No department data found." />
              </Panel>

              <Panel title="Area / ward wise issues" description="Shows wards or areas with most complaints.">
                <MetricList metrics={areaMetrics} emptyText="No area data found." />
              </Panel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <ComplaintList title="Long pending complaints" items={longPending} emptyText="No pending complaints in selected range." />
              <ComplaintList title="High priority complaints" items={importantComplaints} emptyText="No high/urgent pending complaints." />
              <ComplaintList title="Recently resolved" items={recentlyResolved} emptyText="No resolved complaints in selected range." />
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}

function SummaryCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-civic-50 p-3 text-civic-800">{icon}</div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
      <div className="h-full rounded-full bg-civic-700" style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function Indicator({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = total ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">
          {value} <span className="text-xs font-semibold text-slate-500">({formatPercent(percent)})</span>
        </span>
      </div>
      <ProgressBar value={percent} />
    </div>
  );
}

function MetricList({ metrics, emptyText }: { metrics: GroupedMetric[]; emptyText: string }) {
  const max = metrics[0]?.total ?? 0;

  if (!metrics.length) {
    return <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {metrics.map((item) => (
        <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-slate-950">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Pending: {item.pending} · Resolved: {item.resolved}
              </p>
            </div>
            <p className="text-xl font-black text-slate-950">{item.total}</p>
          </div>
          <ProgressBar value={max ? (item.total / max) * 100 : 0} />
        </div>
      ))}
    </div>
  );
}

function ComplaintList({ title, items, emptyText }: { title: string; items: AdminComplaint[]; emptyText: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{emptyText}</p> : null}

        {items.map((item) => (
          <Link
            key={item.id}
            to={`/admin/complaints/${item.id}`}
            className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-civic-200 hover:bg-civic-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-black text-slate-950">{item.tracking_no}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{item.full_name}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {categoryLabels[item.category] ?? item.category} · {item.area}
            </p>
            <p className="mt-1 text-xs text-slate-500">Submitted: {formatDate(item.created_at)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
