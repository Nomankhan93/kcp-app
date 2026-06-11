import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  FileBadge,
  FileCheck2,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import {
  checkCertificateAccess,
  fetchCertificateApplications,
} from "../lib/certificates";
import {
  certificateStatusBadgeClasses,
  certificateStatusLabels,
  certificateTypeLabels,
} from "../lib/constants";
import { supabase } from "../lib/supabase";
import type {
  CertificateApplicationRow,
  CertificateApplicationStatus,
  CertificateType,
} from "../lib/types";

type SessionState = "checking" | "signed-out" | "signed-in";
type DateFilter = "all" | "today" | "7days" | "30days";

type AccessState = {
  allowed: boolean | null;
  role:
    | "admin"
    | "chairman"
    | "staff"
    | "certificate_officer"
    | "general_councilor"
    | null;
};

const statusOptions = Object.entries(certificateStatusLabels) as Array<
  [CertificateApplicationStatus, string]
>;
const typeOptions = Object.entries(certificateTypeLabels) as Array<
  [CertificateType, string]
>;

function isAfterDateFilter(dateValue: string, filter: DateFilter) {
  if (filter === "all") return true;

  const createdAt = new Date(dateValue).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === "today") return createdAt >= now - oneDay;
  if (filter === "7days") return createdAt >= now - 7 * oneDay;
  return createdAt >= now - 30 * oneDay;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isTownQueue(status: CertificateApplicationStatus) {
  return [
    "councilor_verified",
    "town_review",
    "certificate_uploaded",
    "ready_for_collection",
  ].includes(status);
}

export function AdminCertificates() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [access, setAccess] = useState<AccessState>({
    allowed: null,
    role: null,
  });
  const [applications, setApplications] = useState<CertificateApplicationRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | CertificateApplicationStatus
  >("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CertificateType>("all");
  const [wardFilter, setWardFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const pending = applications.filter(
      (item) =>
        ![
          "certificate_uploaded",
          "ready_for_collection",
          "delivered",
          "rejected",
          "councilor_rejected",
        ].includes(item.status),
    ).length;

    return {
      total: applications.length,
      submitted: applications.filter((item) => item.status === "submitted")
        .length,
      councilorReview: applications.filter(
        (item) => item.status === "councilor_review",
      ).length,
      verified: applications.filter(
        (item) => item.councilor_status === "verified",
      ).length,
      ready: applications.filter((item) =>
        ["certificate_uploaded", "ready_for_collection"].includes(item.status),
      ).length,
      finalQueue: applications.filter((item) => isTownQueue(item.status))
        .length,
      delivered: applications.filter((item) => item.status === "delivered")
        .length,
      pending,
      needsCorrection: applications.filter(
        (item) => item.status === "need_more_info",
      ).length,
      rejected: applications.filter((item) =>
        ["rejected", "councilor_rejected"].includes(item.status),
      ).length,
    };
  }, [applications]);

  const wardOptions = useMemo(
    () =>
      Array.from(
        new Set(applications.map((item) => item.ward).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [applications],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return applications.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      const matchesType =
        typeFilter === "all" || item.certificate_type === typeFilter;
      const matchesWard = wardFilter === "all" || item.ward === wardFilter;
      const matchesDate = isAfterDateFilter(item.created_at, dateFilter);
      const matchesSearch =
        !term ||
        item.tracking_no.toLowerCase().includes(term) ||
        item.applicant_name.toLowerCase().includes(term) ||
        item.applicant_mobile.toLowerCase().includes(term) ||
        (item.applicant_cnic ?? "").toLowerCase().includes(term) ||
        item.subject_name.toLowerCase().includes(term) ||
        item.area.toLowerCase().includes(term) ||
        item.ward.toLowerCase().includes(term) ||
        (item.certificate_number ?? "").toLowerCase().includes(term);

      return (
        matchesStatus &&
        matchesType &&
        matchesWard &&
        matchesDate &&
        matchesSearch
      );
    });
  }, [applications, statusFilter, typeFilter, wardFilter, dateFilter, search]);

  useEffect(() => {
    async function init() {
      const accessCheck = await checkCertificateAccess();

      if (!accessCheck.signedIn) {
        setSessionState("signed-out");
        setLoading(false);
        return;
      }

      setSessionState("signed-in");
      setAccess({ allowed: accessCheck.allowed, role: accessCheck.role });

      if (accessCheck.allowed) {
        await loadApplications();
      } else {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function loadApplications() {
    setError("");
    setLoading(true);

    try {
      setApplications(await fetchCertificateApplications());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load certificate applications.",
      );
    } finally {
      setLoading(false);
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
        eyebrow="Admin Dashboard"
        title="Certificate applications"
        description="Manage birth, marriage and death certificate applications. General Councilors verify ward cases, then Town Committee staff upload prepared certificates."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === "checking" ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking
            certificate access...
          </div>
        ) : null}

        {access.allowed === false ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">
              Your account is signed in but not assigned as admin, chairman,
              staff or General Councilor.
            </p>
          </div>
        ) : null}

        {access.allowed ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Complaints
                </Link>
                {access.role === "admin" ||
                access.role === "staff" ||
                access.role === "certificate_officer" ? (
                  <Link
                    to="/admin/certificates/final-processing"
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <FileCheck2 className="mr-2 h-4 w-4" /> Final Processing
                  </Link>
                ) : null}
                {access.role === "admin" || access.role === "chairman" ? (
                  <Link
                    to="/admin/reports"
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Reports
                  </Link>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadApplications}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Stat
                label="Total"
                value={stats.total}
                helper="All applications"
              />
              <Stat
                label="Pending"
                value={stats.pending}
                helper="Not closed"
                tone={stats.pending ? "amber" : "slate"}
              />
              <Stat
                label="Councilor Review"
                value={stats.councilorReview}
                helper="Ward verification"
              />
              <Stat
                label="Final Queue"
                value={stats.finalQueue}
                helper="Town office"
                tone="civic"
              />
              <Stat
                label="Ready"
                value={stats.ready}
                helper="Upload/collect"
                tone={stats.ready ? "emerald" : "slate"}
              />
              <Stat
                label="Delivered"
                value={stats.delivered}
                helper="Completed"
                tone="emerald"
              />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-4">
              <WorkflowCard
                title="1. Submitted"
                value={stats.submitted}
                helper="New applications waiting to enter review."
              />
              <WorkflowCard
                title="2. Ward verification"
                value={stats.councilorReview}
                helper="General Councilor confirms ward details."
              />
              <WorkflowCard
                title="3. Town processing"
                value={stats.finalQueue}
                helper="Certificate officer prepares/upload certificate."
              />
              <WorkflowCard
                title="4. Exceptions"
                value={stats.needsCorrection + stats.rejected}
                helper="Corrections, rejections or blocked applications."
                tone="amber"
              />
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Certificate register
                  </h2>
                  <p className="text-sm text-slate-500">
                    Track councilor verification, final processing, certificate
                    upload and delivery.
                  </p>
                </div>
                <p className="text-sm font-bold text-slate-700">
                  Showing {filtered.length} of {applications.length}
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
                <label className="relative block">
                  <span className="sr-only">Search</span>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search tracking, name, mobile, CNIC, certificate no..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none ring-civic-600 transition focus:ring-2"
                  />
                </label>
                <Select
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(
                      value as "all" | CertificateApplicationStatus,
                    )
                  }
                  options={[["all", "All Statuses"], ...statusOptions]}
                />
                <Select
                  value={typeFilter}
                  onChange={(value) =>
                    setTypeFilter(value as "all" | CertificateType)
                  }
                  options={[["all", "All Types"], ...typeOptions]}
                />
                <Select
                  value={wardFilter}
                  onChange={setWardFilter}
                  options={[
                    ["all", "All Wards"],
                    ...wardOptions.map(
                      (ward) => [ward, ward] as [string, string],
                    ),
                  ]}
                />
                <Select
                  value={dateFilter}
                  onChange={(value) => setDateFilter(value as DateFilter)}
                  options={[
                    ["all", "All Time"],
                    ["today", "Today"],
                    ["7days", "Last 7 Days"],
                    ["30days", "Last 30 Days"],
                  ]}
                />
              </div>

              {error ? (
                <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="mt-5 lg:hidden">
                {loading ? (
                  <div className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                    Loading applications...
                  </div>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center text-slate-500">
                    No certificate applications found.
                  </div>
                ) : null}

                {!loading &&
                  filtered.map((item) => (
                    <div
                      key={item.id}
                      className="border-t border-slate-100 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-sm font-black text-slate-950">
                            {item.tracking_no}
                          </p>
                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {certificateTypeLabels[item.certificate_type]}
                          </p>
                          <p className="text-xs text-slate-500">
                            Subject: {item.subject_name}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${certificateStatusBadgeClasses[item.status]}`}
                        >
                          {certificateStatusLabels[item.status]}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <Info
                          label="Applicant"
                          value={`${item.applicant_name} · ${item.applicant_mobile}`}
                        />
                        <Info
                          label="Ward / Area"
                          value={[item.ward, item.area, item.mohalla]
                            .filter(Boolean)
                            .join(" · ")}
                        />
                        <Info
                          label="Councilor"
                          value={item.councilor_status.replace("_", " ")}
                        />
                        <Info
                          label="Submitted"
                          value={formatDate(item.created_at)}
                        />
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Link
                          to={`/admin/certificates/${item.id}`}
                          className="inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-bold text-white hover:bg-civic-800"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> View
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-5 hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tracking</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Applicant</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Ward</th>
                      <th className="px-4 py-3">Councilor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                          Loading applications...
                        </td>
                      </tr>
                    ) : null}

                    {!loading && filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No certificate applications found.
                        </td>
                      </tr>
                    ) : null}

                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="align-top hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-950">
                          {item.tracking_no}
                        </td>
                        <td className="px-4 py-3">
                          {certificateTypeLabels[item.certificate_type]}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-950">
                            {item.applicant_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.applicant_mobile}
                          </p>
                        </td>
                        <td className="px-4 py-3">{item.subject_name}</td>
                        <td className="px-4 py-3">
                          {item.ward}
                          <p className="text-xs text-slate-500">{item.area}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {item.councilor_status.replace("_", " ")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${certificateStatusBadgeClasses[item.status]}`}
                          >
                            {certificateStatusLabels[item.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/admin/certificates/${item.id}`}
                            className="inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-bold text-white hover:bg-civic-800"
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" /> View
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

type StatTone = "slate" | "amber" | "emerald" | "civic";

function toneClasses(tone: StatTone) {
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  if (tone === "emerald")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "civic") return "border-civic-200 bg-civic-50 text-civic-800";
  return "border-slate-200 bg-white text-slate-950";
}

function Stat({
  label,
  value,
  helper,
  tone = "slate",
}: {
  label: string;
  value: number;
  helper: string;
  tone?: StatTone;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses(tone)}`}>
      <div className="flex items-center gap-2 opacity-75">
        <FileBadge className="h-4 w-4" />
        <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{helper}</p>
    </div>
  );
}

function WorkflowCard({
  title,
  value,
  helper,
  tone = "slate",
}: {
  title: string;
  value: number;
  helper: string;
  tone?: StatTone;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses(tone)}`}>
      <p className="text-sm font-black">{title}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-xs font-semibold leading-5 opacity-75">{helper}</p>
        <p className="text-3xl font-black">{value}</p>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-semibold capitalize text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
    >
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
