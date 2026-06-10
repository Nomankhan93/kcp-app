import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, FileCheck2, Loader2, LogOut, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import {
  checkCertificateAccess,
  fetchCouncilorCertificateApplications,
  fetchCurrentWardCouncilor,
  type CouncilorProfile,
} from '../lib/certificates';
import { certificateStatusBadgeClasses, certificateStatusLabels, certificateTypeLabels } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type { CertificateApplicationRow, CertificateApplicationStatus, CertificateType } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';
type DateFilter = 'all' | 'today' | '7days' | '30days';
type StatusFilter = 'all' | CertificateApplicationStatus;
type TypeFilter = 'all' | CertificateType;

type AccessRole = 'admin' | 'chairman' | 'staff' | 'general_councilor' | null;

const actionableStatuses: CertificateApplicationStatus[] = ['councilor_review', 'need_more_info'];

function isAfterDateFilter(dateValue: string, filter: DateFilter) {
  if (filter === 'all') return true;

  const createdAt = new Date(dateValue).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === 'today') return createdAt >= now - oneDay;
  if (filter === '7days') return createdAt >= now - 7 * oneDay;
  return createdAt >= now - 30 * oneDay;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export function CouncilorCertificates() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [role, setRole] = useState<AccessRole>(null);
  const [profile, setProfile] = useState<CouncilorProfile>(null);
  const [applications, setApplications] = useState<CertificateApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError('');

      try {
        const access = await checkCertificateAccess();

        if (!access.signedIn) {
          setSessionState('signed-out');
          return;
        }

        setSessionState('signed-in');
        setRole(access.role);

        if (access.role !== 'general_councilor') {
          return;
        }

        const [councilorProfile, rows] = await Promise.all([
          fetchCurrentWardCouncilor(),
          fetchCouncilorCertificateApplications(),
        ]);

        setProfile(councilorProfile);
        setApplications(rows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load ward certificate applications.');
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const [councilorProfile, rows] = await Promise.all([
        fetchCurrentWardCouncilor(),
        fetchCouncilorCertificateApplications(),
      ]);
      setProfile(councilorProfile);
      setApplications(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to refresh ward certificate applications.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (typeFilter !== 'all' && item.certificate_type !== typeFilter) return false;
      if (!isAfterDateFilter(item.created_at, dateFilter)) return false;

      if (!query) return true;

      return [
        item.tracking_no,
        item.applicant_name,
        item.applicant_mobile,
        item.applicant_cnic ?? '',
        item.subject_name,
        item.area,
        item.ward,
        item.mohalla ?? '',
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [applications, dateFilter, search, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((item) => actionableStatuses.includes(item.status)).length,
      verified: applications.filter((item) => item.councilor_status === 'verified').length,
      rejected: applications.filter((item) => item.councilor_status === 'rejected').length,
      needCorrection: applications.filter((item) => item.status === 'need_more_info').length,
    };
  }, [applications]);

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="General Councilor Dashboard"
        title="Ward certificate verification"
        description="Review and verify only the birth, marriage and death certificate applications assigned to your ward."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {role && role !== 'general_councilor' ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
            <h2 className="text-xl font-black">General Councilor role required</h2>
            <p className="mt-2 text-sm">This dashboard is for ward General Councilors only. Admin/chairman users should use the admin certificate dashboard.</p>
            <Link to="/admin/certificates" className="mt-4 inline-flex rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800">
              Open Admin Certificate Dashboard
            </Link>
          </div>
        ) : null}

        {role === 'general_councilor' ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-3xl border border-civic-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-civic-50 p-3 text-civic-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-civic-700">Assigned ward</p>
                    <h2 className="text-xl font-black text-slate-950">{profile?.ward ?? 'Not assigned'}</h2>
                    <p className="text-sm text-slate-600">{profile?.full_name ?? 'Councilor profile missing'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={refresh} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button type="button" onClick={signOut} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </button>
              </div>
            </div>

            {!profile && !loading ? (
              <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
                <h2 className="text-xl font-black">Ward assignment missing</h2>
                <p className="mt-2 text-sm">This account has general_councilor role, but no active ward is assigned in ward_councilors. Ask admin to link this user with Ward 01 to Ward 10.</p>
              </div>
            ) : null}

            {error ? <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

            <div className="grid gap-4 md:grid-cols-5">
              <StatCard label="My Ward Total" value={stats.total} />
              <StatCard label="Pending Review" value={stats.pending} />
              <StatCard label="Verified" value={stats.verified} />
              <StatCard label="Need Correction" value={stats.needCorrection} />
              <StatCard label="Rejected" value={stats.rejected} />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_160px]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tracking, name, mobile, CNIC, area..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none ring-civic-600 transition focus:ring-2"
                  />
                </label>

                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">
                  <option value="all">All statuses</option>
                  {Object.entries(certificateStatusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                </select>

                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeFilter)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">
                  <option value="all">All types</option>
                  {Object.entries(certificateTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
                </select>

                <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">
                  <option value="all">All time</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 days</option>
                  <option value="30days">Last 30 days</option>
                </select>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Tracking</th>
                      <th className="px-5 py-3">Applicant</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Area</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading applications...
                        </td>
                      </tr>
                    ) : null}

                    {!loading && filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">No applications found for your ward.</td>
                      </tr>
                    ) : null}

                    {filteredApplications.map((application) => (
                      <tr key={application.id} className="align-top hover:bg-slate-50">
                        <td className="px-5 py-4 font-mono font-bold text-slate-950">{application.tracking_no}</td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{application.applicant_name}</p>
                          <p className="text-xs text-slate-500">{application.applicant_mobile}</p>
                          <p className="text-xs text-slate-500">Subject: {application.subject_name}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">{certificateTypeLabels[application.certificate_type]}</td>
                        <td className="px-5 py-4 text-slate-700">{application.ward}<br /><span className="text-xs text-slate-500">{application.area}{application.mohalla ? ` · ${application.mohalla}` : ''}</span></td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${certificateStatusBadgeClasses[application.status]}`}>{certificateStatusLabels[application.status]}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatDate(application.created_at)}</td>
                        <td className="px-5 py-4 text-right">
                          <Link to={`/councilor/certificates/${application.id}`} className="inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-bold text-white hover:bg-civic-800">
                            <Eye className="mr-1 h-3.5 w-3.5" /> Review
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-civic-50 p-3 text-civic-700">
          <FileCheck2 className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
