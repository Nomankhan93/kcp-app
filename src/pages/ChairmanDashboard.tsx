import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  FileWarning,
  Layers3,
  ListChecks,
  Loader2,
  LogOut,
  MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { checkAdminAccess, fetchAdminComplaints } from "../lib/adminComplaints";
import {
  categoryLabels,
  certificateStatusBadgeClasses,
  certificateStatusLabels,
  certificateTypeLabels,
  statusLabels,
} from "../lib/constants";
import { fetchCertificateApplications } from "../lib/certificates";
import { supabase } from "../lib/supabase";
import type {
  AdminComplaint,
  CertificateApplicationRow,
  CertificateApplicationStatus,
  CertificateType,
  ComplaintStatus,
} from "../lib/types";

type SessionState = "checking" | "signed-out" | "signed-in";
type DateFilter = "all" | "today" | "7days" | "30days" | "month";
type AlertTone = "slate" | "civic" | "amber" | "emerald" | "rose" | "blue";

type AccessState = {
  allowed: boolean | null;
  role: "admin" | "chairman" | "staff" | null;
};

type GroupedMetric = {
  name: string;
  total: number;
  pending: number;
  resolved: number;
  urgent?: number;
};

type WardMetric = {
  ward: string;
  complaints: number;
  pendingComplaints: number;
  urgentComplaints: number;
  certificates: number;
  pendingCertificates: number;
  councilorPending: number;
  overdue: number;
};

type CouncilorMetric = {
  ward: string;
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  officeQueue: number;
  oldestPendingDays: number;
};

type SearchResult = {
  id: string;
  type: "complaint" | "certificate";
  trackingNo: string;
  title: string;
  subtitle: string;
  status: string;
  href: string;
  createdAt: string;
};

const complaintClosedStatuses: ComplaintStatus[] = [
  "resolved",
  "rejected",
  "not_related",
];

const certificateClosedStatuses: CertificateApplicationStatus[] = [
  "delivered",
  "rejected",
];

const certificateCouncilorQueueStatuses: CertificateApplicationStatus[] = [
  "submitted",
  "councilor_review",
];

const certificateOfficeQueueStatuses: CertificateApplicationStatus[] = [
  "councilor_verified",
  "town_review",
  "certificate_uploaded",
  "ready_for_collection",
];

const rangeLabels: Record<DateFilter, string> = {
  all: "All Time",
  today: "Today",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  month: "This Month",
};

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
}

function getCutoff(filter: DateFilter) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === "all") return null;
  if (filter === "today") return now - oneDay;
  if (filter === "7days") return now - 7 * oneDay;
  if (filter === "30days") return now - 30 * oneDay;
  return startOfCurrentMonth();
}

function isInDateRange(dateValue: string, filter: DateFilter) {
  const cutoff = getCutoff(filter);
  if (!cutoff) return true;
  return new Date(dateValue).getTime() >= cutoff;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function daysBetween(start: string, end: string) {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, diff / (24 * 60 * 60 * 1000));
}

function ageInDays(dateValue: string) {
  return daysBetween(dateValue, new Date().toISOString());
}

function formatAge(dateValue: string) {
  const days = Math.floor(ageInDays(dateValue));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function isComplaintPending(item: AdminComplaint) {
  return !complaintClosedStatuses.includes(item.status);
}

function isComplaintOverdue(item: AdminComplaint) {
  return isComplaintPending(item) && ageInDays(item.created_at) >= 7;
}

function isCertificatePending(item: CertificateApplicationRow) {
  return !certificateClosedStatuses.includes(item.status);
}

function isCertificateOverdue(item: CertificateApplicationRow) {
  if (!isCertificatePending(item)) return false;

  const age = ageInDays(item.created_at);
  if (item.status === "submitted" || item.status === "councilor_review") {
    return age >= 3;
  }

  if (item.status === "councilor_verified" || item.status === "town_review") {
    return age >= 5;
  }

  if (item.status === "certificate_uploaded" || item.status === "ready_for_collection") {
    return age >= 3;
  }

  return age >= 7;
}

function getComplaintWard(item: AdminComplaint) {
  return item.ward?.trim() || item.area?.trim() || "Ward not selected";
}

function getCertificateWard(item: CertificateApplicationRow) {
  return item.ward?.trim() || item.area?.trim() || "Ward not selected";
}

function groupComplaints(
  items: AdminComplaint[],
  getKey: (item: AdminComplaint) => string,
): GroupedMetric[] {
  const map = new Map<string, GroupedMetric>();

  for (const item of items) {
    const key = getKey(item).trim() || "Not Assigned";
    const current = map.get(key) ?? {
      name: key,
      total: 0,
      pending: 0,
      resolved: 0,
      urgent: 0,
    };

    current.total += 1;
    if (isComplaintPending(item)) current.pending += 1;
    if (item.status === "resolved") current.resolved += 1;
    if (item.priority === "urgent" || item.priority === "high") {
      current.urgent = (current.urgent ?? 0) + 1;
    }

    map.set(key, current);
  }

  return Array.from(map.values()).sort(
    (a, b) => b.pending - a.pending || b.total - a.total || a.name.localeCompare(b.name),
  );
}

function buildWardMetrics(
  complaints: AdminComplaint[],
  certificates: CertificateApplicationRow[],
): WardMetric[] {
  const map = new Map<string, WardMetric>();

  const getMetric = (ward: string) => {
    const key = ward.trim() || "Ward not selected";
    const current = map.get(key) ?? {
      ward: key,
      complaints: 0,
      pendingComplaints: 0,
      urgentComplaints: 0,
      certificates: 0,
      pendingCertificates: 0,
      councilorPending: 0,
      overdue: 0,
    };
    map.set(key, current);
    return current;
  };

  for (const complaint of complaints) {
    const metric = getMetric(getComplaintWard(complaint));
    metric.complaints += 1;
    if (isComplaintPending(complaint)) metric.pendingComplaints += 1;
    if (complaint.priority === "urgent" || complaint.priority === "high") {
      metric.urgentComplaints += 1;
    }
    if (isComplaintOverdue(complaint)) metric.overdue += 1;
  }

  for (const certificate of certificates) {
    const metric = getMetric(getCertificateWard(certificate));
    metric.certificates += 1;
    if (isCertificatePending(certificate)) metric.pendingCertificates += 1;
    if (certificateCouncilorQueueStatuses.includes(certificate.status)) {
      metric.councilorPending += 1;
    }
    if (isCertificateOverdue(certificate)) metric.overdue += 1;
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.overdue - a.overdue ||
      b.pendingComplaints + b.pendingCertificates - (a.pendingComplaints + a.pendingCertificates) ||
      a.ward.localeCompare(b.ward),
  );
}

function buildCouncilorMetrics(applications: CertificateApplicationRow[]): CouncilorMetric[] {
  const map = new Map<string, CouncilorMetric>();

  for (const item of applications) {
    const ward = getCertificateWard(item);
    const current = map.get(ward) ?? {
      ward,
      total: 0,
      pending: 0,
      verified: 0,
      rejected: 0,
      officeQueue: 0,
      oldestPendingDays: 0,
    };

    current.total += 1;
    if (certificateCouncilorQueueStatuses.includes(item.status)) {
      current.pending += 1;
      current.oldestPendingDays = Math.max(
        current.oldestPendingDays,
        Math.floor(ageInDays(item.created_at)),
      );
    }
    if (item.councilor_status === "verified" || item.status === "councilor_verified") {
      current.verified += 1;
    }
    if (item.councilor_status === "rejected" || item.status === "councilor_rejected") {
      current.rejected += 1;
    }
    if (certificateOfficeQueueStatuses.includes(item.status)) {
      current.officeQueue += 1;
    }

    map.set(ward, current);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.pending - a.pending ||
      b.oldestPendingDays - a.oldestPendingDays ||
      a.ward.localeCompare(b.ward),
  );
}

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function buildSearchResults(
  query: string,
  complaints: AdminComplaint[],
  certificates: CertificateApplicationRow[],
): SearchResult[] {
  const clean = query.trim().toLowerCase();
  if (clean.length < 2) return [];

  const complaintResults = complaints
    .filter(
      (item) =>
        textIncludes(item.tracking_no, clean) ||
        textIncludes(item.full_name, clean) ||
        textIncludes(item.mobile, clean) ||
        textIncludes(item.cnic, clean) ||
        textIncludes(item.ward, clean) ||
        textIncludes(item.area, clean) ||
        textIncludes(item.mohalla, clean) ||
        textIncludes(categoryLabels[item.category], clean),
    )
    .map<SearchResult>((item) => ({
      id: item.id,
      type: "complaint",
      trackingNo: item.tracking_no,
      title: item.full_name,
      subtitle: `${categoryLabels[item.category] ?? item.category} · ${item.ward ?? item.area}`,
      status: statusLabels[item.status],
      href: `/admin/complaints/${item.id}`,
      createdAt: item.created_at,
    }));

  const certificateResults = certificates
    .filter(
      (item) =>
        textIncludes(item.tracking_no, clean) ||
        textIncludes(item.applicant_name, clean) ||
        textIncludes(item.applicant_mobile, clean) ||
        textIncludes(item.applicant_cnic, clean) ||
        textIncludes(item.subject_name, clean) ||
        textIncludes(item.ward, clean) ||
        textIncludes(item.area, clean) ||
        textIncludes(item.mohalla, clean) ||
        textIncludes(certificateTypeLabels[item.certificate_type], clean),
    )
    .map<SearchResult>((item) => ({
      id: item.id,
      type: "certificate",
      trackingNo: item.tracking_no,
      title: item.subject_name,
      subtitle: `${certificateTypeLabels[item.certificate_type]} · ${item.ward}`,
      status: certificateStatusLabels[item.status],
      href: `/admin/certificates/${item.id}`,
      createdAt: item.created_at,
    }));

  return [...complaintResults, ...certificateResults]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
}

export function ChairmanDashboard() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [access, setAccess] = useState<AccessState>({
    allowed: null,
    role: null,
  });
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [certificates, setCertificates] = useState<CertificateApplicationRow[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("30days");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateWarning, setCertificateWarning] = useState("");

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => isInDateRange(item.created_at, dateFilter));
  }, [complaints, dateFilter]);

  const filteredCertificates = useMemo(() => {
    return certificates.filter((item) => isInDateRange(item.created_at, dateFilter));
  }, [certificates, dateFilter]);

  const complaintAnalytics = useMemo(() => {
    const total = filteredComplaints.length;
    const submitted = filteredComplaints.filter((item) => item.status === "submitted").length;
    const received = filteredComplaints.filter((item) => item.status === "received").length;
    const inProgress = filteredComplaints.filter((item) => item.status === "in_progress").length;
    const resolved = filteredComplaints.filter((item) => item.status === "resolved").length;
    const rejected = filteredComplaints.filter((item) => item.status === "rejected").length;
    const notRelated = filteredComplaints.filter((item) => item.status === "not_related").length;
    const pending = submitted + received + inProgress;
    const urgent = filteredComplaints.filter(
      (item) => item.priority === "urgent" || item.priority === "high",
    ).length;
    const overdue = filteredComplaints.filter(isComplaintOverdue).length;
    const unassigned = filteredComplaints.filter(
      (item) => isComplaintPending(item) && !item.assigned_staff_id && !item.assigned_to,
    ).length;
    const closed = resolved + rejected + notRelated;
    const resolutionRate = total ? (resolved / total) * 100 : 0;
    const pendingRate = total ? (pending / total) * 100 : 0;
    const resolvedWithDates = filteredComplaints.filter(
      (item) => item.status === "resolved" && item.resolved_at,
    );
    const averageResolutionDays = resolvedWithDates.length
      ? resolvedWithDates.reduce(
          (sum, item) => sum + daysBetween(item.created_at, item.resolved_at as string),
          0,
        ) / resolvedWithDates.length
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
      overdue,
      unassigned,
      closed,
      resolutionRate,
      pendingRate,
      averageResolutionDays,
    };
  }, [filteredComplaints]);

  const certificateAnalytics = useMemo(() => {
    const total = filteredCertificates.length;
    const pending = filteredCertificates.filter(isCertificatePending).length;
    const delivered = filteredCertificates.filter((item) => item.status === "delivered").length;
    const rejected = filteredCertificates.filter((item) => item.status === "rejected").length;
    const councilorPending = filteredCertificates.filter((item) =>
      certificateCouncilorQueueStatuses.includes(item.status),
    ).length;
    const officePending = filteredCertificates.filter((item) =>
      certificateOfficeQueueStatuses.includes(item.status),
    ).length;
    const readyForCollection = filteredCertificates.filter(
      (item) => item.status === "ready_for_collection",
    ).length;
    const uploaded = filteredCertificates.filter((item) => item.status === "certificate_uploaded").length;
    const needMoreInfo = filteredCertificates.filter((item) => item.status === "need_more_info").length;
    const overdue = filteredCertificates.filter(isCertificateOverdue).length;
    const deliveryRate = total ? (delivered / total) * 100 : 0;

    return {
      total,
      pending,
      delivered,
      rejected,
      councilorPending,
      officePending,
      readyForCollection,
      uploaded,
      needMoreInfo,
      overdue,
      deliveryRate,
    };
  }, [filteredCertificates]);

  const calendarStats = useMemo(() => {
    return {
      complaintsToday: complaints.filter((item) => isInDateRange(item.created_at, "today")).length,
      complaintsWeek: complaints.filter((item) => isInDateRange(item.created_at, "7days")).length,
      complaintsMonth: complaints.filter((item) => isInDateRange(item.created_at, "month")).length,
      certificatesToday: certificates.filter((item) => isInDateRange(item.created_at, "today")).length,
      certificatesWeek: certificates.filter((item) => isInDateRange(item.created_at, "7days")).length,
      certificatesMonth: certificates.filter((item) => isInDateRange(item.created_at, "month")).length,
    };
  }, [complaints, certificates]);

  const departmentMetrics = useMemo(() => {
    return groupComplaints(
      filteredComplaints,
      (item) => item.assigned_department || categoryLabels[item.category] || item.category,
    ).slice(0, 8);
  }, [filteredComplaints]);

  const staffMetrics = useMemo(() => {
    return groupComplaints(
      filteredComplaints,
      (item) => item.assigned_to || item.assigned_department || "Unassigned",
    ).slice(0, 8);
  }, [filteredComplaints]);

  const wardMetrics = useMemo(() => {
    return buildWardMetrics(filteredComplaints, filteredCertificates).slice(0, 10);
  }, [filteredComplaints, filteredCertificates]);

  const councilorMetrics = useMemo(() => {
    return buildCouncilorMetrics(filteredCertificates).slice(0, 10);
  }, [filteredCertificates]);

  const complaintStatusMetrics = useMemo(() => {
    return Object.entries(statusLabels).map(([status, label]) => ({
      label,
      status: status as ComplaintStatus,
      total: filteredComplaints.filter((item) => item.status === status).length,
    }));
  }, [filteredComplaints]);

  const certificateStatusMetrics = useMemo(() => {
    return Object.entries(certificateStatusLabels).map(([status, label]) => ({
      label,
      status: status as CertificateApplicationStatus,
      total: filteredCertificates.filter((item) => item.status === status).length,
    }));
  }, [filteredCertificates]);

  const certificateTypeMetrics = useMemo(() => {
    return (Object.entries(certificateTypeLabels) as Array<[CertificateType, string]>).map(
      ([type, label]) => {
        const rows = filteredCertificates.filter((item) => item.certificate_type === type);
        return {
          label,
          total: rows.length,
          pending: rows.filter(isCertificatePending).length,
          delivered: rows.filter((item) => item.status === "delivered").length,
        };
      },
    );
  }, [filteredCertificates]);

  const longPendingComplaints = useMemo(() => {
    return filteredComplaints
      .filter(isComplaintPending)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);
  }, [filteredComplaints]);

  const urgentComplaints = useMemo(() => {
    return filteredComplaints
      .filter(
        (item) =>
          (item.priority === "urgent" || item.priority === "high") && isComplaintPending(item),
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);
  }, [filteredComplaints]);

  const delayedCertificates = useMemo(() => {
    return filteredCertificates
      .filter(isCertificatePending)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, 5);
  }, [filteredCertificates]);

  const searchResults = useMemo(() => {
    return buildSearchResults(searchQuery, complaints, certificates);
  }, [searchQuery, complaints, certificates]);

  const attentionItems = useMemo(() => {
    return [
      {
        label: "Overdue complaints",
        value: complaintAnalytics.overdue,
        helper: "Pending more than 7 days",
        tone: complaintAnalytics.overdue ? "rose" : "emerald",
      },
      {
        label: "Unassigned complaints",
        value: complaintAnalytics.unassigned,
        helper: "Need staff assignment",
        tone: complaintAnalytics.unassigned ? "amber" : "emerald",
      },
      {
        label: "Councilor verification pending",
        value: certificateAnalytics.councilorPending,
        helper: "Certificates waiting at ward level",
        tone: certificateAnalytics.councilorPending ? "amber" : "emerald",
      },
      {
        label: "Office certificate queue",
        value: certificateAnalytics.officePending,
        helper: "Ready for Town Office processing",
        tone: certificateAnalytics.officePending ? "civic" : "slate",
      },
      {
        label: "Certificate overdue",
        value: certificateAnalytics.overdue,
        helper: "Delayed from expected review time",
        tone: certificateAnalytics.overdue ? "rose" : "emerald",
      },
    ] satisfies Array<{
      label: string;
      value: number;
      helper: string;
      tone: AlertTone;
    }>;
  }, [complaintAnalytics, certificateAnalytics]);

  useEffect(() => {
    async function init() {
      const accessCheck = await checkAdminAccess();

      if (!accessCheck.signedIn) {
        setSessionState("signed-out");
        setLoading(false);
        return;
      }

      setSessionState("signed-in");
      setAccess({ allowed: accessCheck.allowed, role: accessCheck.role });

      if (accessCheck.role === "admin" || accessCheck.role === "chairman") {
        await loadDashboard();
      } else {
        setLoading(false);
      }
    }

    void init();
  }, []);

  async function loadDashboard() {
    setError("");
    setCertificateWarning("");
    setLoading(true);

    try {
      const [complaintRows, certificateResult] = await Promise.allSettled([
        fetchAdminComplaints(),
        fetchCertificateApplications(),
      ]);

      if (complaintRows.status === "fulfilled") {
        setComplaints(complaintRows.value);
      } else {
        throw complaintRows.reason;
      }

      if (certificateResult.status === "fulfilled") {
        setCertificates(certificateResult.value);
      } else {
        setCertificates([]);
        setCertificateWarning(
          certificateResult.reason instanceof Error
            ? certificateResult.reason.message
            : "Certificate monitoring data could not be loaded.",
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Chairman Executive Dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  if (sessionState === "signed-out") return <Navigate to="/admin/login" replace />;

  const allowed = access.role === "admin" || access.role === "chairman";

  return (
    <>
      <PageHeader
        eyebrow="Chairman Executive Dashboard"
        title="Executive Monitoring Command Center"
        description="One-screen view of complaints, certificates, ward performance, councilor verification, staff workload and chairman-level escalation signals."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && sessionState === "checking" ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking chairman dashboard access...
          </div>
        ) : null}

        {sessionState === "signed-in" && !allowed ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">
              Chairman Executive Dashboard is available only for accounts assigned as chairman or admin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/admin"
                className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-800 ring-1 ring-rose-200"
              >
                Back to Admin
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white"
              >
                Logout
              </button>
            </div>
          </div>
        ) : null}

        {allowed ? (
          <>
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                  Signed in role: {access.role ?? "authorized"}
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Selected range: {rangeLabels[dateFilter]}. Use this screen for monitoring, follow-up and escalation. Final data depends on records accessible to this account.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Admin
                </Link>
                <Link
                  to="/admin/certificates"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <BadgeCheck className="mr-2 h-4 w-4" /> Certificates
                </Link>
                <Link
                  to="/admin/reports"
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="mr-2 h-4 w-4" /> Reports
                </Link>
                <button
                  type="button"
                  onClick={loadDashboard}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {(Object.entries(rangeLabels) as Array<[DateFilter, string]>).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDateFilter(value)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${
                      dateFilter === value
                        ? "border-civic-700 bg-civic-700 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="relative block">
                <span className="sr-only">Search complaints and certificates</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search tracking no, citizen, CNIC, mobile, ward..."
                  className="h-full min-h-14 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-civic-500 focus:ring-4 focus:ring-civic-100"
                />
              </label>
            </div>

            {error ? (
              <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </p>
            ) : null}

            {certificateWarning ? (
              <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                Certificate monitoring warning: {certificateWarning}
              </p>
            ) : null}

            {loading ? (
              <div className="mb-6 flex justify-center rounded-3xl border border-slate-200 bg-white py-10 text-slate-500 shadow-sm">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading executive dashboard data...
              </div>
            ) : null}

            <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
              <ExecutiveMetricCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Complaints"
                value={complaintAnalytics.total}
                helper={rangeLabels[dateFilter]}
              />
              <ExecutiveMetricCard
                icon={<Clock3 className="h-5 w-5" />}
                label="Pending"
                value={complaintAnalytics.pending}
                helper={formatPercent(complaintAnalytics.pendingRate)}
                tone={complaintAnalytics.pending ? "amber" : "emerald"}
              />
              <ExecutiveMetricCard
                icon={<FileWarning className="h-5 w-5" />}
                label="Overdue"
                value={complaintAnalytics.overdue}
                helper="7+ days"
                tone={complaintAnalytics.overdue ? "rose" : "emerald"}
              />
              <ExecutiveMetricCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Urgent"
                value={complaintAnalytics.urgent}
                helper="High priority"
                tone={complaintAnalytics.urgent ? "rose" : "slate"}
              />
              <ExecutiveMetricCard
                icon={<BadgeCheck className="h-5 w-5" />}
                label="Certificates"
                value={certificateAnalytics.total}
                helper={rangeLabels[dateFilter]}
                tone="blue"
              />
              <ExecutiveMetricCard
                icon={<Users className="h-5 w-5" />}
                label="Councilor Queue"
                value={certificateAnalytics.councilorPending}
                helper="Ward verification"
                tone={certificateAnalytics.councilorPending ? "amber" : "emerald"}
              />
              <ExecutiveMetricCard
                icon={<Building2 className="h-5 w-5" />}
                label="Office Queue"
                value={certificateAnalytics.officePending}
                helper="Town processing"
                tone={certificateAnalytics.officePending ? "civic" : "slate"}
              />
              <ExecutiveMetricCard
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Resolved / Delivered"
                value={complaintAnalytics.resolved + certificateAnalytics.delivered}
                helper={`${formatPercent(complaintAnalytics.resolutionRate)} / ${formatPercent(certificateAnalytics.deliveryRate)}`}
                tone="emerald"
              />
            </div>

            <div className="mb-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <Panel
                title="Today’s Attention"
                description="Chairman-level signals that need follow-up before routine work."
                icon={<ShieldCheck className="h-5 w-5" />}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {attentionItems.map((item) => (
                    <AttentionCard key={item.label} {...item} />
                  ))}
                </div>
              </Panel>

              <Panel
                title="Smart Search"
                description="Find complaint or certificate by tracking number, citizen, mobile, CNIC, ward or area."
                icon={<Search className="h-5 w-5" />}
              >
                {searchQuery.trim().length < 2 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Type at least 2 characters to search all complaints and certificates.
                  </div>
                ) : searchResults.length ? (
                  <div className="space-y-3">
                    {searchResults.map((item) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={item.href}
                        className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-civic-200 hover:bg-civic-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-sm font-black text-slate-950">{item.trackingNo}</p>
                            <p className="mt-1 text-sm font-bold text-slate-800">{item.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
                            {item.type}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          {item.status} · {formatDate(item.createdAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No matching complaints or certificates found.
                  </div>
                )}
              </Panel>
            </div>

            <div className="mb-6 grid gap-3 lg:grid-cols-6">
              <MiniStat label="Complaints Today" value={calendarStats.complaintsToday} />
              <MiniStat label="Complaints 7 Days" value={calendarStats.complaintsWeek} />
              <MiniStat label="Complaints Month" value={calendarStats.complaintsMonth} />
              <MiniStat label="Certificates Today" value={calendarStats.certificatesToday} />
              <MiniStat label="Certificates 7 Days" value={calendarStats.certificatesWeek} />
              <MiniStat label="Certificates Month" value={calendarStats.certificatesMonth} />
            </div>

            <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel
                title="Ward Performance Command Board"
                description="Combined view of complaints, certificates, councilor queue and overdue workload."
                icon={<MapPinned className="h-5 w-5" />}
              >
                <WardPerformanceTable metrics={wardMetrics} />
              </Panel>

              <Panel
                title="Executive Actions"
                description="Quick paths for chairman monitoring and office follow-up."
                icon={<ListChecks className="h-5 w-5" />}
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <QuickAction
                    to="/admin"
                    title="Review complaint queue"
                    helper="Open full admin complaint list for assignment and status follow-up."
                  />
                  <QuickAction
                    to="/admin/certificates"
                    title="Review certificate queue"
                    helper="Monitor birth, marriage and death certificate applications."
                  />
                  <QuickAction
                    to="/admin/certificates/final-processing"
                    title="Final processing desk"
                    helper="Check applications ready for Town Office processing and issuance."
                  />
                  <QuickAction
                    to="/admin/reports"
                    title="Open official reports"
                    helper="Generate ward-wise, department-wise and monthly performance reports."
                  />
                </div>
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <Panel
                title="Department Performance"
                description="Departments/categories with highest visible workload."
                icon={<Building2 className="h-5 w-5" />}
              >
                <MetricList metrics={departmentMetrics} emptyText="No department data found." />
              </Panel>

              <Panel
                title="Staff Workload"
                description="Assigned staff/department workload from complaint records."
                icon={<Users className="h-5 w-5" />}
              >
                <MetricList metrics={staffMetrics} emptyText="No staff assignment data found." />
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <Panel
                title="Complaint Status Distribution"
                description="Status-wise complaint health for selected date range."
                icon={<ClipboardCheck className="h-5 w-5" />}
              >
                <ComplaintStatusGrid metrics={complaintStatusMetrics} total={complaintAnalytics.total} />
              </Panel>

              <Panel
                title="Certificate Pipeline"
                description="Certificate application status and service type distribution."
                icon={<Layers3 className="h-5 w-5" />}
              >
                <CertificateStatusGrid metrics={certificateStatusMetrics} total={certificateAnalytics.total} />
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {certificateTypeMetrics.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">{item.label}</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{item.total}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Pending: {item.pending} · Delivered: {item.delivered}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <div className="mb-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel
                title="Councilor Verification Performance"
                description="Ward-wise certificate verification workload and oldest pending case."
                icon={<Users className="h-5 w-5" />}
              >
                <CouncilorPerformance metrics={councilorMetrics} />
              </Panel>

              <Panel
                title="Escalation Center"
                description="Oldest pending and priority cases for chairman-level review."
                icon={<AlertTriangle className="h-5 w-5" />}
              >
                <div className="grid gap-4 lg:grid-cols-3">
                  <ComplaintList
                    title="Long pending complaints"
                    items={longPendingComplaints}
                    emptyText="No pending complaints in selected range."
                  />
                  <ComplaintList
                    title="High priority complaints"
                    items={urgentComplaints}
                    emptyText="No high/urgent pending complaints."
                  />
                  <CertificateList
                    title="Delayed certificates"
                    items={delayedCertificates}
                    emptyText="No pending certificate applications in selected range."
                  />
                </div>
              </Panel>
            </div>

            <Panel
              title="Chairman Review Notes"
              description="Operational guidance for using this dashboard without changing official records directly."
              icon={<FileText className="h-5 w-5" />}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <GuidanceCard
                  title="Monitor"
                  helper="Use ward, department and councilor performance to identify where service delivery is slow."
                />
                <GuidanceCard
                  title="Escalate"
                  helper="Open the case detail from Escalation Center and ask the responsible office to update status or remarks."
                />
                <GuidanceCard
                  title="Review Reports"
                  helper="Use reports for official meetings, monthly review and public service performance monitoring."
                />
              </div>
            </Panel>
          </>
        ) : null}
      </section>
    </>
  );
}

function ExecutiveMetricCard({
  icon,
  label,
  value,
  helper,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  helper: string;
  tone?: AlertTone;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className={`rounded-2xl p-3 ${toneIconClasses(tone)}`}>{icon}</div>
        <p className="text-right text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
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

function tonePanelClasses(tone: AlertTone) {
  if (tone === "civic") return "border-civic-200 bg-civic-50 text-civic-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "rose") return "border-rose-200 bg-rose-50 text-rose-900";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-slate-200 bg-white text-slate-950";
}

function toneIconClasses(tone: AlertTone) {
  if (tone === "civic") return "bg-civic-50 text-civic-800";
  if (tone === "amber") return "bg-amber-50 text-amber-800";
  if (tone === "emerald") return "bg-emerald-50 text-emerald-700";
  if (tone === "rose") return "bg-rose-50 text-rose-700";
  if (tone === "blue") return "bg-blue-50 text-blue-700";
  return "bg-slate-50 text-slate-700";
}

function AttentionCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  tone: AlertTone;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${tonePanelClasses(tone)}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black">{label}</p>
          <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{helper}</p>
        </div>
        <p className="text-3xl font-black">{value}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        {icon ? <div className="rounded-2xl bg-civic-50 p-3 text-civic-800">{icon}</div> : null}
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
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

function MetricList({
  metrics,
  emptyText,
}: {
  metrics: GroupedMetric[];
  emptyText: string;
}) {
  const max = metrics[0]?.total ?? 0;

  if (!metrics.length) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {metrics.map((item) => (
        <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-slate-950">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                Pending: {item.pending} · Resolved: {item.resolved} · Priority: {item.urgent ?? 0}
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

function WardPerformanceTable({ metrics }: { metrics: WardMetric[] }) {
  if (!metrics.length) {
    return <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No ward data found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ward</th>
              <th className="px-4 py-3">Complaints</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Certificates</th>
              <th className="px-4 py-3">Councilor Queue</th>
              <th className="px-4 py-3">Overdue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {metrics.map((item) => (
              <tr key={item.ward}>
                <td className="px-4 py-3 font-black text-slate-950">{item.ward}</td>
                <td className="px-4 py-3 text-slate-700">{item.complaints}</td>
                <td className="px-4 py-3 text-slate-700">
                  {item.pendingComplaints} <span className="text-xs text-slate-400">/ urgent {item.urgentComplaints}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{item.certificates}</td>
                <td className="px-4 py-3 text-slate-700">{item.councilorPending}</td>
                <td className="px-4 py-3 font-black text-rose-700">{item.overdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 bg-slate-50 p-3 lg:hidden">
        {metrics.map((item) => (
          <div key={item.ward} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black text-slate-950">{item.ward}</p>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                Overdue {item.overdue}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <p>Complaints: <b>{item.complaints}</b></p>
              <p>Pending: <b>{item.pendingComplaints}</b></p>
              <p>Certificates: <b>{item.certificates}</b></p>
              <p>Councilor queue: <b>{item.councilorPending}</b></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComplaintStatusGrid({
  metrics,
  total,
}: {
  metrics: Array<{ label: string; status: ComplaintStatus; total: number }>;
  total: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {metrics.map((item) => (
        <div key={item.status} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <StatusBadge status={item.status} />
            <span className="text-xl font-black text-slate-950">{item.total}</span>
          </div>
          <ProgressBar value={total ? (item.total / total) * 100 : 0} />
        </div>
      ))}
    </div>
  );
}

function CertificateStatusGrid({
  metrics,
  total,
}: {
  metrics: Array<{ label: string; status: CertificateApplicationStatus; total: number }>;
  total: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {metrics.map((item) => (
        <div key={item.status} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${certificateStatusBadgeClasses[item.status]}`}>
              {item.label}
            </span>
            <span className="text-xl font-black text-slate-950">{item.total}</span>
          </div>
          <ProgressBar value={total ? (item.total / total) * 100 : 0} />
        </div>
      ))}
    </div>
  );
}

function CouncilorPerformance({ metrics }: { metrics: CouncilorMetric[] }) {
  if (!metrics.length) {
    return (
      <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No certificate verification data found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {metrics.map((item) => (
        <div key={item.ward} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black text-slate-950">{item.ward}</p>
              <p className="mt-1 text-xs text-slate-500">
                Verified: {item.verified} · Rejected: {item.rejected} · Office queue: {item.officeQueue}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-950">{item.pending}</p>
              <p className="text-xs font-semibold text-slate-500">pending</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
            Oldest pending verification: {item.oldestPendingDays ? `${item.oldestPendingDays} days` : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickAction({ to, title, helper }: { to: string; title: string; helper: string }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-civic-200 hover:bg-civic-50"
    >
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">{helper}</p>
    </Link>
  );
}

function ComplaintList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: AdminComplaint[];
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {emptyText}
          </p>
        ) : null}

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
              {categoryLabels[item.category] ?? item.category} · {item.ward ?? item.area}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Age: {formatAge(item.created_at)} · Submitted: {formatDate(item.created_at)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CertificateList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: CertificateApplicationRow[];
  emptyText: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {emptyText}
          </p>
        ) : null}

        {items.map((item) => (
          <Link
            key={item.id}
            to={`/admin/certificates/${item.id}`}
            className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-civic-200 hover:bg-civic-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-black text-slate-950">{item.tracking_no}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{item.subject_name}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${certificateStatusBadgeClasses[item.status]}`}>
                {certificateStatusLabels[item.status]}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {certificateTypeLabels[item.certificate_type]} · {item.ward}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Age: {formatAge(item.created_at)} · Submitted: {formatDate(item.created_at)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function GuidanceCard({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}
