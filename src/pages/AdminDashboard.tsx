import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BarChart3, Eye, FileText, Loader2, LogOut, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { checkAdminAccess, fetchAdminComplaints } from '../lib/adminComplaints';
import { categoryLabels, statusLabels } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { AdminComplaint, ComplaintCategory, ComplaintStatus } from '../lib/types';

const statusOptions = Object.entries(statusLabels) as Array<[ComplaintStatus, string]>;
const categoryOptions = Object.entries(categoryLabels) as Array<[ComplaintCategory, string]>;

type SessionState = 'checking' | 'signed-out' | 'signed-in';
type DateFilter = 'all' | 'today' | '7days' | '30days';

type AccessState = {
  allowed: boolean | null;
  role: 'admin' | 'chairman' | 'staff' | null;
};

function isAfterDateFilter(dateValue: string, filter: DateFilter) {
  if (filter === 'all') return true;

  const createdAt = new Date(dateValue).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === 'today') return createdAt >= now - oneDay;
  if (filter === '7days') return createdAt >= now - 7 * oneDay;
  return createdAt >= now - 30 * oneDay;
}

export function AdminDashboard() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [access, setAccess] = useState<AccessState>({ allowed: null, role: null });
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ComplaintCategory>('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const pending = complaints.filter((item) => !['resolved', 'rejected', 'not_related'].includes(item.status)).length;

    return {
      total: complaints.length,
      newComplaints: complaints.filter((item) => item.status === 'submitted').length,
      received: complaints.filter((item) => item.status === 'received').length,
      inProgress: complaints.filter((item) => item.status === 'in_progress').length,
      resolved: complaints.filter((item) => item.status === 'resolved').length,
      pending,
    };
  }, [complaints]);

  const areaOptions = useMemo(() => {
    return Array.from(new Set(complaints.map((item) => item.area).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [complaints]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return complaints.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesArea = areaFilter === 'all' || item.area === areaFilter;
      const matchesDate = isAfterDateFilter(item.created_at, dateFilter);
      const assignedTo = item.assigned_to ?? '';
      const department = item.assigned_department ?? '';
      const cnic = item.cnic ?? '';
      const matchesSearch =
        !term ||
        item.tracking_no.toLowerCase().includes(term) ||
        item.full_name.toLowerCase().includes(term) ||
        item.mobile.toLowerCase().includes(term) ||
        cnic.toLowerCase().includes(term) ||
        item.area.toLowerCase().includes(term) ||
        assignedTo.toLowerCase().includes(term) ||
        department.toLowerCase().includes(term) ||
        (categoryLabels[item.category] ?? item.category).toLowerCase().includes(term);

      return matchesStatus && matchesCategory && matchesArea && matchesDate && matchesSearch;
    });
  }, [complaints, statusFilter, categoryFilter, areaFilter, dateFilter, search]);

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

      if (accessCheck.allowed) {
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
      setError(loadError instanceof Error ? loadError.message : 'Unable to load complaints.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Complaint management"
        description="Review new complaints, filter by category/area/status, assign staff, and open details for status updates."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === 'checking' ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking admin access...
          </div>
        ) : null}

        {access.allowed === false ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">Your account is signed in but not assigned as admin, chairman or staff in user_roles table.</p>
            <button onClick={handleLogout} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">
              Logout
            </button>
          </div>
        ) : null}

        {access.allowed ? (
          <>
            <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                  Signed in role: {access.role ?? 'authorized'}
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Staff accounts only see complaints available under their assigned access rules after the Admin v2 SQL is applied.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin/certificates"
                  className="inline-flex items-center rounded-2xl border border-civic-200 bg-civic-50 px-4 py-2 text-sm font-bold text-civic-800 hover:bg-civic-100"
                >
                  <FileText className="mr-2 h-4 w-4" /> Certificates
                </Link>
                {(access.role === 'admin' || access.role === 'chairman') ? (
                  <Link
                    to="/admin/reports"
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> Reports
                  </Link>
                ) : null}
                {(access.role === 'admin' || access.role === 'chairman') ? (
                  <Link
                    to="/admin/chairman-dashboard"
                    className="inline-flex items-center rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" /> Chairman Dashboard
                  </Link>
                ) : null}
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

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Stat label="Total" value={stats.total} />
              <Stat label="Pending" value={stats.pending} />
              <Stat label="New" value={stats.newComplaints} />
              <Stat label="Received" value={stats.received} />
              <Stat label="In Progress" value={stats.inProgress} />
              <Stat label="Resolved" value={stats.resolved} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1.4fr_180px_220px_180px_160px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tracking no, name, CNIC, mobile, area, staff"
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none ring-civic-600 transition focus:ring-2"
                  />
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | ComplaintStatus)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                >
                  <option value="all">All Statuses</option>
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value as 'all' | ComplaintCategory)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                >
                  <option value="all">All Categories</option>
                  {categoryOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  value={areaFilter}
                  onChange={(event) => setAreaFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                >
                  <option value="all">All Areas</option>
                  {areaOptions.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>

                <select
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value as DateFilter)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Last 24 Hours</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="30days">Last 30 Days</option>
                </select>
              </div>

              {error ? <p className="m-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tracking</th>
                      <th className="px-4 py-3">Citizen</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Area / Ward</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Assigned</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          <Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> Loading complaints...
                        </td>
                      </tr>
                    ) : null}

                    {!loading && filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          No complaints found for selected filters.
                        </td>
                      </tr>
                    ) : null}

                    {!loading &&
                      filtered.map((item) => (
                        <tr key={item.id} className="align-top hover:bg-slate-50">
                          <td className="px-4 py-4">
                            <p className="font-mono font-black text-slate-950">{item.tracking_no}</p>
                            <p className="mt-1 text-xs text-slate-500">Priority: {item.priority}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-slate-950">{item.full_name}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.mobile}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{categoryLabels[item.category] ?? item.category}</td>
                          <td className="px-4 py-4 text-slate-700">
                            <p>{item.area}</p>
                            <p className="mt-1 text-xs text-slate-500">{[item.ward, item.mohalla].filter(Boolean).join(' · ') || '—'}</p>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-4 py-4 text-slate-700">
                            <p>{item.assigned_department || 'Not assigned'}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.assigned_to || 'No staff selected'}</p>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{new Date(item.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-4 text-right">
                            <Link
                              to={`/admin/complaints/${item.id}`}
                              className="inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-bold text-white hover:bg-civic-800"
                            >
                              <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}
