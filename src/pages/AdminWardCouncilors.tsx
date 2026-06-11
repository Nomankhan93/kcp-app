import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, LogOut, RefreshCw, Save, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import {
  checkUserManagementAccess,
  fetchPortalUsersWithRoles,
  fetchWardCouncilorManagementRows,
  saveWardCouncilorAssignment,
} from '../lib/userManagement';
import { supabase } from '../lib/supabase';
import type { PortalAuthUserRow, PortalRole, WardCouncilorManagementRow } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

type AccessState = {
  allowed: boolean | null;
  role: PortalRole | null;
};

type EditableWardCouncilor = {
  userId: string;
  fullName: string;
  mobile: string;
  designation: string;
  isActive: boolean;
};

function makeEditable(row: WardCouncilorManagementRow): EditableWardCouncilor {
  return {
    userId: row.user_id ?? '',
    fullName: row.full_name ?? `General Councilor ${row.ward}`,
    mobile: row.mobile ?? '',
    designation: row.designation ?? 'General Councilor',
    isActive: row.is_active,
  };
}

function getUserLabel(user: PortalAuthUserRow) {
  return `${user.email ?? 'No email'} — ${user.user_id}`;
}

export function AdminWardCouncilors() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [access, setAccess] = useState<AccessState>({ allowed: null, role: null });
  const [rows, setRows] = useState<WardCouncilorManagementRow[]>([]);
  const [users, setUsers] = useState<PortalAuthUserRow[]>([]);
  const [edits, setEdits] = useState<Record<string, EditableWardCouncilor>>({});
  const [loading, setLoading] = useState(true);
  const [savingWard, setSavingWard] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      return (
        row.ward.toLowerCase().includes(term) ||
        (row.full_name ?? '').toLowerCase().includes(term) ||
        (row.email ?? '').toLowerCase().includes(term) ||
        (row.mobile ?? '').toLowerCase().includes(term) ||
        (row.user_id ?? '').toLowerCase().includes(term)
      );
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const assigned = rows.filter((row) => Boolean(row.user_id)).length;
    const active = rows.filter((row) => row.is_active && row.user_id).length;
    return {
      total: rows.length,
      assigned,
      unassigned: Math.max(rows.length - assigned, 0),
      active,
    };
  }, [rows]);

  useEffect(() => {
    async function init() {
      const accessCheck = await checkUserManagementAccess();

      if (!accessCheck.signedIn) {
        setSessionState('signed-out');
        setLoading(false);
        return;
      }

      setSessionState('signed-in');
      setAccess({ allowed: accessCheck.allowed, role: accessCheck.role });

      if (accessCheck.allowed) {
        await loadData();
      } else {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function loadData() {
    setError('');
    setLoading(true);

    try {
      const [wardRows, userRows] = await Promise.all([fetchWardCouncilorManagementRows(), fetchPortalUsersWithRoles()]);
      setRows(wardRows);
      setUsers(userRows);
      setEdits(Object.fromEntries(wardRows.map((row) => [row.ward, makeEditable(row)])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load ward councilor assignments. Run staff-ward-management-v1.sql first.');
    } finally {
      setLoading(false);
    }
  }

  function updateEdit(ward: string, values: Partial<EditableWardCouncilor>) {
    setEdits((current) => ({
      ...current,
      [ward]: {
        ...(current[ward] ?? { userId: '', fullName: `General Councilor ${ward}`, mobile: '', designation: 'General Councilor', isActive: true }),
        ...values,
      },
    }));
  }

  async function handleSave(row: WardCouncilorManagementRow) {
    const edit = edits[row.ward] ?? makeEditable(row);
    setSavingWard(row.ward);
    setMessage('');
    setError('');

    try {
      await saveWardCouncilorAssignment({
        ward: row.ward,
        userId: edit.userId || null,
        fullName: edit.fullName || `General Councilor ${row.ward}`,
        mobile: edit.mobile || null,
        designation: edit.designation || 'General Councilor',
        isActive: edit.isActive,
      });
      await loadData();
      setMessage(`${row.ward} General Councilor assignment updated.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save ward assignment.');
    } finally {
      setSavingWard('');
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
        eyebrow="Ward Councilor Management"
        title="10 ward General Councilor assignments"
        description="Assign each General Councilor to one ward. Councilors are not full admins; they can only verify certificate applications from their assigned ward."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === 'checking' ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking access...
          </div>
        ) : null}

        {access.allowed === false ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">Only admin users can manage ward councilor assignments.</p>
            <button onClick={handleLogout} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">
              Logout
            </button>
          </div>
        ) : null}

        {access.allowed ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                Signed in role: {access.role ?? 'authorized'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/admin" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Admin Dashboard
                </Link>
                <Link to="/admin/users" className="inline-flex items-center rounded-2xl border border-civic-200 bg-civic-50 px-4 py-2 text-sm font-bold text-civic-800 hover:bg-civic-100">
                  <Users className="mr-2 h-4 w-4" /> User Roles
                </Link>
                <button onClick={loadData} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button onClick={handleLogout} className="inline-flex items-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Total Wards" value={stats.total} />
              <Stat label="Assigned" value={stats.assigned} />
              <Stat label="Unassigned" value={stats.unassigned} />
              <Stat label="Active Councilors" value={stats.active} />
            </div>

            <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-900">
              <p className="font-bold">How to use</p>
              <p className="mt-1">Create the councilor login in Supabase Auth first, then select that user here. Saving assignment automatically gives the selected user the limited general_councilor role.</p>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="relative block">
                <span className="sr-only">Search wards</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ward, name, email, mobile or user UUID..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-civic-600 transition focus:ring-2"
                />
              </label>

              {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
              {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Councilor Details</th>
                      <th className="px-4 py-3">Login User</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Loading ward assignments...
                        </td>
                      </tr>
                    ) : null}

                    {!loading && filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No ward assignments found.</td>
                      </tr>
                    ) : null}

                    {filteredRows.map((row) => {
                      const edit = edits[row.ward] ?? makeEditable(row);
                      return (
                        <tr key={row.ward} className="align-top hover:bg-slate-50/80">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-950">{row.ward}</p>
                            <p className="mt-1 text-xs text-slate-500">Certificate applications from this ward go to this councilor.</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-2">
                              <input
                                value={edit.fullName}
                                onChange={(event) => updateEdit(row.ward, { fullName: event.target.value })}
                                placeholder="Councilor full name"
                                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-civic-600 transition focus:ring-2"
                              />
                              <input
                                value={edit.mobile}
                                onChange={(event) => updateEdit(row.ward, { mobile: event.target.value })}
                                placeholder="Mobile number"
                                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-civic-600 transition focus:ring-2"
                              />
                              <input
                                value={edit.designation}
                                onChange={(event) => updateEdit(row.ward, { designation: event.target.value })}
                                placeholder="Designation"
                                className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none ring-civic-600 transition focus:ring-2"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={edit.userId}
                              onChange={(event) => updateEdit(row.ward, { userId: event.target.value })}
                              className="w-80 max-w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-civic-600 transition focus:ring-2"
                            >
                              <option value="">Unassigned</option>
                              {users.map((user) => (
                                <option key={user.user_id} value={user.user_id}>{getUserLabel(user)}</option>
                              ))}
                            </select>
                            <p className="mt-2 text-xs text-slate-500">Current: {row.email ?? row.user_id ?? 'Not assigned'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                              <input
                                type="checkbox"
                                checked={edit.isActive}
                                onChange={(event) => updateEdit(row.ward, { isActive: event.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-civic-700 focus:ring-civic-600"
                              />
                              Active
                            </label>
                            <p className="mt-2 text-xs text-slate-500">
                              {row.user_id ? 'Assigned user has ward access after saving.' : 'No user assigned yet.'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => void handleSave(row)}
                              disabled={savingWard === row.ward}
                              className="inline-flex items-center rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {savingWard === row.ward ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        {label === 'Active Councilors' ? <UserCog className="h-5 w-5 text-civic-700" /> : <ShieldCheck className="h-5 w-5 text-civic-700" />}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
