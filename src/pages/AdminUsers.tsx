import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ConfirmDialog, EmptyState, InlineToast, PermissionDeniedState } from "../components/ui/Feedback";
import {
  checkUserManagementAccess,
  fetchPortalUsersWithRoles,
  manageablePortalRoles,
  setPortalUserRole,
} from "../lib/userManagement";
import { supabase } from "../lib/supabase";
import type { PortalAuthUserRow, PortalRole } from "../lib/types";

type SessionState = "checking" | "signed-out" | "signed-in";

type AccessState = {
  allowed: boolean | null;
  role: PortalRole | null;
};

type PendingRoleChange = {
  user: PortalAuthUserRow;
  role: PortalRole;
  enabled: boolean;
};

function roleBadgeClass(role: PortalRole) {
  if (role === "admin") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (role === "chairman") return "bg-civic-50 text-civic-800 ring-civic-100";
  if (role === "staff") return "bg-blue-50 text-blue-700 ring-blue-100";
  if (role === "certificate_officer")
    return "bg-purple-50 text-purple-700 ring-purple-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function AdminUsers() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [access, setAccess] = useState<AccessState>({
    allowed: null,
    role: null,
  });
  const [users, setUsers] = useState<PortalAuthUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) => {
      const roles = user.roles ?? [];
      return (
        user.user_id.toLowerCase().includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        roles.some((role) => role.toLowerCase().includes(term))
      );
    });
  }, [users, search]);

  const stats = useMemo(() => {
    const countByRole = new Map<PortalRole, number>();
    for (const role of manageablePortalRoles) countByRole.set(role.value, 0);

    for (const user of users) {
      for (const role of user.roles ?? []) {
        countByRole.set(role, (countByRole.get(role) ?? 0) + 1);
      }
    }

    return {
      totalUsers: users.length,
      adminUsers: countByRole.get("admin") ?? 0,
      chairmanUsers: countByRole.get("chairman") ?? 0,
      staffUsers: countByRole.get("staff") ?? 0,
      certificateOfficers: countByRole.get("certificate_officer") ?? 0,
      councilors: countByRole.get("general_councilor") ?? 0,
    };
  }, [users]);

  useEffect(() => {
    async function init() {
      const accessCheck = await checkUserManagementAccess();

      if (!accessCheck.signedIn) {
        setSessionState("signed-out");
        setLoading(false);
        return;
      }

      setSessionState("signed-in");
      setAccess({ allowed: accessCheck.allowed, role: accessCheck.role });

      if (accessCheck.allowed) {
        await loadUsers();
      } else {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function loadUsers() {
    setError("");
    setLoading(true);

    try {
      setUsers(await fetchPortalUsersWithRoles());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load users. Run staff-ward-management-v1.sql first.",
      );
    } finally {
      setLoading(false);
    }
  }

  function requestRoleToggle(
    user: PortalAuthUserRow,
    role: PortalRole,
    enabled: boolean,
  ) {
    setPendingRoleChange({ user, role, enabled });
  }

  async function handleRoleToggle(
    user: PortalAuthUserRow,
    role: PortalRole,
    enabled: boolean,
  ) {
    const key = `${user.user_id}-${role}`;
    setSavingKey(key);
    setError("");
    setMessage("");

    try {
      await setPortalUserRole(user.user_id, role, enabled);
      await loadUsers();
      setMessage(
        `${role.replace("_", " ")} role ${enabled ? "assigned to" : "removed from"} ${user.email ?? user.user_id}.`,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update user role.",
      );
    } finally {
      setSavingKey("");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  if (sessionState === "signed-out")
    return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="User Management"
        title="Staff roles and portal access"
        description="Assign limited portal roles to existing Supabase Auth users. General Councilors should only receive the ward-based general_councilor role."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === "checking" ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking access...
          </div>
        ) : null}

        {access.allowed === false ? (
          <PermissionDeniedState
            title="Access denied"
            description="Only admin users can manage portal roles. Chairman users have monitoring/read-only access only."
            action={(
              <button
                onClick={handleLogout}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800"
              >
                Logout
              </button>
            )}
          />
        ) : null}

        {access.allowed ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                Signed in role: {access.role ?? "authorized"} · Admin-only area
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Admin Dashboard
                </Link>
                <Link
                  to="/admin/ward-councilors"
                  className="inline-flex items-center rounded-2xl border border-civic-200 bg-civic-50 px-4 py-2 text-sm font-bold text-civic-800 hover:bg-civic-100"
                >
                  <Users className="mr-2 h-4 w-4" /> Ward Councilors
                </Link>
                <button
                  onClick={loadUsers}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Stat label="Auth Users" value={stats.totalUsers} />
              <Stat label="Admins" value={stats.adminUsers} />
              <Stat label="Chairman" value={stats.chairmanUsers} />
              <Stat label="Staff" value={stats.staffUsers} />
              <Stat label="Cert Officers" value={stats.certificateOfficers} />
              <Stat label="Councilors" value={stats.councilors} />
            </div>

            <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <p className="font-bold">Important workflow</p>
              <p className="mt-1">
                Create the user first in Supabase Authentication, then assign a
                portal role here. This page is admin-only; Chairman accounts
                cannot change roles.
              </p>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="relative block">
                <span className="sr-only">Search users</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by email, user UUID or role..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-civic-600 transition focus:ring-2"
                />
              </label>

              {message ? (
                <div className="mt-4">
                  <InlineToast tone="success" message={message} onDismiss={() => setMessage("")} />
                </div>
              ) : null}
              {error ? (
                <div className="mt-4">
                  <InlineToast tone="error" message={error} onDismiss={() => setError("")} />
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Portal users
                  </h2>
                  <p className="text-sm text-slate-500">
                    Assign only the minimum role needed for each office user.
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-700">
                  Showing {filteredUsers.length} of {users.length}
                </p>
              </div>

              <div className="mt-5 lg:hidden">
                {loading ? (
                  <div className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                    Loading users...
                  </div>
                ) : null}

                {!loading && filteredUsers.length === 0 ? (
                  <EmptyState title="No users found" description="Try a different search term or create users in Supabase Authentication first." />
                ) : null}

                {filteredUsers.map((user) => {
                  const roles = user.roles ?? [];
                  return (
                    <div
                      key={user.user_id}
                      className="border-t border-slate-100 py-4"
                    >
                      <div>
                        <p className="font-bold text-slate-950">
                          {user.email ?? "No email"}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-slate-500">
                          {user.user_id}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {roles.length ? (
                          roles.map((role) => (
                            <span
                              key={role}
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${roleBadgeClass(role)}`}
                            >
                              {role.replace("_", " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">
                            No portal role
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid gap-2">
                        {manageablePortalRoles.map((roleItem) => {
                          const checked = roles.includes(roleItem.value);
                          const key = `${user.user_id}-${roleItem.value}`;
                          return (
                            <label
                              key={roleItem.value}
                              className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={savingKey === key}
                                onChange={(event) =>
                                  requestRoleToggle(
                                    user,
                                    roleItem.value,
                                    event.target.checked,
                                  )
                                }
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-civic-700 focus:ring-civic-600"
                              />
                              <span>
                                <span className="block font-bold text-slate-900">
                                  {roleItem.label}
                                </span>
                                <span className="block leading-5 text-slate-500">
                                  {roleItem.description}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                        <Info
                          label="Created"
                          value={formatDate(user.created_at)}
                        />
                        <Info
                          label="Last login"
                          value={formatDate(user.last_sign_in_at)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Current Roles</th>
                      <th className="px-4 py-3">Assign Roles</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                          Loading users...
                        </td>
                      </tr>
                    ) : null}

                    {!loading && filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10">
                          <EmptyState title="No users found" description="Try a different search term or create users in Supabase Authentication first." />
                        </td>
                      </tr>
                    ) : null}

                    {filteredUsers.map((user) => {
                      const roles = user.roles ?? [];
                      return (
                        <tr
                          key={user.user_id}
                          className="align-top hover:bg-slate-50/80"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-950">
                              {user.email ?? "No email"}
                            </p>
                            <p className="mt-1 font-mono text-xs text-slate-500">
                              {user.user_id}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {roles.length ? (
                                roles.map((role) => (
                                  <span
                                    key={role}
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ${roleBadgeClass(role)}`}
                                  >
                                    {role.replace("_", " ")}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400">
                                  No portal role
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-2 md:grid-cols-2">
                              {manageablePortalRoles.map((roleItem) => {
                                const checked = roles.includes(roleItem.value);
                                const key = `${user.user_id}-${roleItem.value}`;
                                return (
                                  <label
                                    key={roleItem.value}
                                    className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={savingKey === key}
                                      onChange={(event) =>
                                        requestRoleToggle(
                                          user,
                                          roleItem.value,
                                          event.target.checked,
                                        )
                                      }
                                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-civic-700 focus:ring-civic-600"
                                    />
                                    <span>
                                      <span className="block font-bold text-slate-900">
                                        {roleItem.label}
                                      </span>
                                      <span className="block leading-5 text-slate-500">
                                        {roleItem.description}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {formatDate(user.last_sign_in_at)}
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
      <ConfirmDialog
        open={Boolean(pendingRoleChange)}
        title={pendingRoleChange?.enabled ? "Assign portal role?" : "Remove portal role?"}
        description={(
          <span>
            You are about to {pendingRoleChange?.enabled ? "assign" : "remove"} the <strong>{pendingRoleChange?.role.replace("_", " ")}</strong> role {pendingRoleChange?.enabled ? "to" : "from"} <strong>{pendingRoleChange?.user.email ?? pendingRoleChange?.user.user_id}</strong>. This affects portal access immediately.
          </span>
        )}
        confirmLabel={pendingRoleChange?.enabled ? "Assign Role" : "Remove Role"}
        tone={pendingRoleChange?.enabled ? "warning" : "error"}
        busy={Boolean(pendingRoleChange && savingKey === `${pendingRoleChange.user.user_id}-${pendingRoleChange.role}`)}
        onCancel={() => setPendingRoleChange(null)}
        onConfirm={() => {
          if (!pendingRoleChange) return;
          const { user, role, enabled } = pendingRoleChange;
          setPendingRoleChange(null);
          void handleRoleToggle(user, role, enabled);
        }}
      />

    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <ShieldCheck className="h-5 w-5 text-civic-700" />
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}
