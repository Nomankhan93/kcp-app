import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  LogOut,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { checkAdminAccess, fetchAdminComplaints } from '../lib/adminComplaints';
import { categoryLabels, statusLabels } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { AdminComplaint, ComplaintStatus } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';
type DateFilter = 'today' | '7days' | '30days' | 'month' | 'all';

type AccessState = {
  allowed: boolean | null;
  role: 'admin' | 'chairman' | 'staff' | null;
};

type MetricRow = {
  name: string;
  total: number;
  pending: number;
  resolved: number;
  urgent: number;
};

const closedStatuses: ComplaintStatus[] = ['resolved', 'rejected', 'not_related'];
const rangeLabels: Record<DateFilter, string> = {
  today: 'Today',
  '7days': 'Last 7 Days',
  '30days': 'Last 30 Days',
  month: 'This Month',
  all: 'All Time',
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function getCutoff(filter: DateFilter) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === 'all') return null;
  if (filter === 'today') return startOfToday();
  if (filter === '7days') return now - 7 * oneDay;
  if (filter === '30days') return now - 30 * oneDay;
  return startOfCurrentMonth();
}

function isInDateRange(dateValue: string, filter: DateFilter) {
  const cutoff = getCutoff(filter);
  if (!cutoff) return true;
  return new Date(dateValue).getTime() >= cutoff;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function groupBy(items: AdminComplaint[], getKey: (item: AdminComplaint) => string): MetricRow[] {
  const map = new Map<string, MetricRow>();

  for (const item of items) {
    const key = getKey(item).trim() || 'Not Assigned';
    const current = map.get(key) ?? { name: key, total: 0, pending: 0, resolved: 0, urgent: 0 };

    current.total += 1;
    if (item.status === 'resolved') current.resolved += 1;
    if (!closedStatuses.includes(item.status)) current.pending += 1;
    if (item.priority === 'urgent' || item.priority === 'high') current.urgent += 1;

    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export function AdminReports() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [access, setAccess] = useState<AccessState>({ allowed: null, role: null });
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('30days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => isInDateRange(item.created_at, dateFilter));
  }, [complaints, dateFilter]);

  const summary = useMemo(() => {
    const total = filteredComplaints.length;
    const submitted = filteredComplaints.filter((item) => item.status === 'submitted').length;
    const received = filteredComplaints.filter((item) => item.status === 'received').length;
    const inProgress = filteredComplaints.filter((item) => item.status === 'in_progress').length;
    const resolved = filteredComplaints.filter((item) => item.status === 'resolved').length;
    const rejected = filteredComplaints.filter((item) => item.status === 'rejected').length;
    const notRelated = filteredComplaints.filter((item) => item.status === 'not_related').length;
    const pending = submitted + received + inProgress;
    const highPriority = filteredComplaints.filter((item) => item.priority === 'urgent' || item.priority === 'high').length;

    return {
      total,
      submitted,
      received,
      inProgress,
      pending,
      resolved,
      rejected,
      notRelated,
      highPriority,
      resolutionRate: total ? (resolved / total) * 100 : 0,
      pendingRate: total ? (pending / total) * 100 : 0,
    };
  }, [filteredComplaints]);

  const departmentMetrics = useMemo(() => {
    return groupBy(filteredComplaints, (item) => item.assigned_department || categoryLabels[item.category] || item.category);
  }, [filteredComplaints]);

  const categoryMetrics = useMemo(() => {
    return groupBy(filteredComplaints, (item) => categoryLabels[item.category] || item.category);
  }, [filteredComplaints]);

  const areaMetrics = useMemo(() => {
    return groupBy(filteredComplaints, (item) => [item.ward, item.area].filter(Boolean).join(' - ') || item.area);
  }, [filteredComplaints]);

  const statusMetrics = useMemo(() => {
    return Object.entries(statusLabels).map(([status, label]) => ({
      label,
      status: status as ComplaintStatus,
      total: filteredComplaints.filter((item) => item.status === status).length,
    }));
  }, [filteredComplaints]);

  const reportRows = useMemo(() => {
    return [...filteredComplaints].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      setError(loadError instanceof Error ? loadError.message : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  function handlePrint() {
    window.print();
  }

  function exportDetailedCsv() {
    downloadCsv(`kunri-complaints-${dateFilter}.csv`, [
      [
        'Tracking No',
        'Submitted At',
        'Citizen Name',
        'Mobile',
        'Category',
        'Area',
        'Ward',
        'Mohalla',
        'Status',
        'Priority',
        'Assigned Department',
        'Assigned To',
        'Resolved At',
        'Public Remarks',
      ],
      ...reportRows.map((item) => [
        item.tracking_no,
        formatDateTime(item.created_at),
        item.full_name,
        item.mobile,
        categoryLabels[item.category] || item.category,
        item.area,
        item.ward,
        item.mohalla,
        statusLabels[item.status],
        item.priority,
        item.assigned_department,
        item.assigned_to,
        formatDateTime(item.resolved_at),
        item.public_remarks,
      ]),
    ]);
  }

  function exportSummaryCsv() {
    downloadCsv(`kunri-report-summary-${dateFilter}.csv`, [
      ['Report', 'Value'],
      ['Range', rangeLabels[dateFilter]],
      ['Generated At', formatDateTime(new Date().toISOString())],
      ['Total Complaints', summary.total],
      ['Pending Complaints', summary.pending],
      ['Resolved Complaints', summary.resolved],
      ['Resolution Rate', formatPercent(summary.resolutionRate)],
      ['High/Urgent Complaints', summary.highPriority],
      [],
      ['Department', 'Total', 'Pending', 'Resolved', 'High/Urgent'],
      ...departmentMetrics.map((item) => [item.name, item.total, item.pending, item.resolved, item.urgent]),
      [],
      ['Area/Ward', 'Total', 'Pending', 'Resolved', 'High/Urgent'],
      ...areaMetrics.map((item) => [item.name, item.total, item.pending, item.resolved, item.urgent]),
    ]);
  }

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  const allowed = access.role === 'admin' || access.role === 'chairman';

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Complaint reports and print summary"
        description="Generate daily, weekly, monthly and all-time complaint reports for official review, printing or CSV export."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === 'checking' ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking reports access...
          </div>
        ) : null}

        {sessionState === 'signed-in' && !allowed ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">Reports are available only for accounts assigned as chairman or admin.</p>
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
          <div className="print-report">
            <div className="no-print mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                  Signed in role: {access.role ?? 'authorized'}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Selected range: {rangeLabels[dateFilter]}. CSV exports do not include CNIC by default.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Admin List
                </Link>
                <button
                  onClick={loadComplaints}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button
                  onClick={exportSummaryCsv}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="mr-2 h-4 w-4" /> Summary CSV
                </button>
                <button
                  onClick={exportDetailedCsv}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="mr-2 h-4 w-4" /> Detailed CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800"
                >
                  <Printer className="mr-2 h-4 w-4" /> Print Report
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="no-print mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

            <div className="mb-6 hidden rounded-2xl border-b border-slate-200 pb-4 print:block">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-civic-800">Town Committee Kunri</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">Complaint Report - {rangeLabels[dateFilter]}</h1>
              <p className="mt-1 text-sm text-slate-600">Generated: {formatDateTime(new Date().toISOString())}</p>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <ReportCard icon={<FileText className="h-5 w-5" />} label="Total" value={summary.total} helper={rangeLabels[dateFilter]} />
              <ReportCard icon={<CalendarDays className="h-5 w-5" />} label="Pending" value={summary.pending} helper={formatPercent(summary.pendingRate)} />
              <ReportCard icon={<FileText className="h-5 w-5" />} label="Submitted" value={summary.submitted} helper="New requests" />
              <ReportCard icon={<FileText className="h-5 w-5" />} label="In Progress" value={summary.inProgress} helper="Active work" />
              <ReportCard icon={<FileText className="h-5 w-5" />} label="Resolved" value={summary.resolved} helper={formatPercent(summary.resolutionRate)} />
              <ReportCard icon={<FileText className="h-5 w-5" />} label="High/Urgent" value={summary.highPriority} helper="Priority" />
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <ReportPanel title="Status summary" description="Complaint count by official workflow status.">
                <div className="space-y-3">
                  {statusMetrics.map((item) => (
                    <div key={item.status} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <StatusBadge status={item.status} />
                      <span className="text-xl font-black text-slate-950">{item.total}</span>
                    </div>
                  ))}
                </div>
              </ReportPanel>

              <ReportPanel title="Department workload" description="Total, pending, resolved and priority complaints by department/category.">
                <MetricTable rows={departmentMetrics} emptyText="No department data found." />
              </ReportPanel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <ReportPanel title="Category wise report" description="Complaint volume by complaint category.">
                <MetricTable rows={categoryMetrics} emptyText="No category data found." />
              </ReportPanel>

              <ReportPanel title="Area / ward wise report" description="Complaint volume by area or ward.">
                <MetricTable rows={areaMetrics} emptyText="No area data found." />
              </ReportPanel>
            </div>

            <ReportPanel title="Detailed complaint register" description="Operational register for the selected report range.">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tracking</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Citizen</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned</th>
                      <th className="px-4 py-3">Resolved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportRows.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3 font-bold text-civic-800">{item.tracking_no}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950">{item.full_name}</p>
                          <p className="text-xs text-slate-500">{item.mobile}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{categoryLabels[item.category] || item.category}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.area}
                          {item.ward ? <span className="block text-xs text-slate-500">{item.ward}</span> : null}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                        <td className="px-4 py-3 text-slate-700">{item.assigned_to || item.assigned_department || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(item.resolved_at)}</td>
                      </tr>
                    ))}

                    {!reportRows.length ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No complaints found for selected range.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </ReportPanel>
          </div>
        ) : null}
      </section>
    </>
  );
}

function ReportCard({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: number | string; helper: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-civic-50 p-3 text-civic-800">{icon}</div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
    </div>
  );
}

function ReportPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:border-slate-300 print:shadow-none">
      <div className="mb-4">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function MetricTable({ rows, emptyText }: { rows: MetricRow[]; emptyText: string }) {
  if (!rows.length) return <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{emptyText}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Pending</th>
            <th className="px-4 py-3 text-right">Resolved</th>
            <th className="px-4 py-3 text-right">High/Urgent</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((item) => (
            <tr key={item.name}>
              <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-950">{item.total}</td>
              <td className="px-4 py-3 text-right text-amber-700">{item.pending}</td>
              <td className="px-4 py-3 text-right text-emerald-700">{item.resolved}</td>
              <td className="px-4 py-3 text-right text-rose-700">{item.urgent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
