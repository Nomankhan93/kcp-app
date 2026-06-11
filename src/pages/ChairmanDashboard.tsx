import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
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
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
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
type DateFilter = "today" | "7days" | "30days" | "month" | "all";
type Tone = "neutral" | "good" | "watch" | "danger" | "info" | "civic";

type AccessState = {
  allowed: boolean | null;
  role: "admin" | "chairman" | "staff" | null;
};

type GroupedMetric = {
  name: string;
  total: number;
  pending: number;
  resolved: number;
  urgent: number;
  overdue: number;
};

type WardMetric = {
  ward: string;
  complaints: number;
  pendingComplaints: number;
  urgentComplaints: number;
  certificates: number;
  pendingCertificates: number;
  councilorPending: number;
  officePending: number;
  overdue: number;
  healthScore: number;
  risk: "Good" | "Watch" | "Critical";
};

type CouncilorMetric = {
  ward: string;
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  officeQueue: number;
  oldestPendingDays: number;
  healthScore: number;
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

type EscalationItem = {
  id: string;
  type: "Complaint" | "Certificate";
  trackingNo: string;
  citizen: string;
  ward: string;
  issue: string;
  reason: string;
  status: string;
  ageDays: number;
  href: string;
  tone: Tone;
};

const complaintClosedStatuses: ComplaintStatus[] = ["resolved", "rejected", "not_related"];
const certificateClosedStatuses: CertificateApplicationStatus[] = ["delivered", "rejected"];
const certificateCouncilorQueueStatuses: CertificateApplicationStatus[] = ["submitted", "councilor_review"];
const certificateOfficeQueueStatuses: CertificateApplicationStatus[] = [
  "councilor_verified",
  "town_review",
  "certificate_uploaded",
  "ready_for_collection",
];

const rangeLabels: Record<DateFilter, string> = {
  today: "Today",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  month: "This Month",
  all: "All Time",
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

  if (filter === "all") return null;
  if (filter === "today") return startOfToday();
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

function formatDateTime(value: Date) {
  return value.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  if (item.status === "submitted" || item.status === "councilor_review") return age >= 3;
  if (item.status === "councilor_verified" || item.status === "town_review") return age >= 5;
  if (item.status === "certificate_uploaded" || item.status === "ready_for_collection") return age >= 3;
  return age >= 7;
}

function getComplaintWard(item: AdminComplaint) {
  return item.ward?.trim() || item.area?.trim() || "Ward not selected";
}

function getCertificateWard(item: CertificateApplicationRow) {
  return item.ward?.trim() || item.area?.trim() || "Ward not selected";
}

function calculateHealthScore({
  pending,
  overdue,
  urgent,
  councilorPending = 0,
  officePending = 0,
}: {
  pending: number;
  overdue: number;
  urgent: number;
  councilorPending?: number;
  officePending?: number;
}) {
  const penalty = overdue * 28 + urgent * 18 + pending * 7 + councilorPending * 8 + officePending * 4;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function riskFromScore(score: number): WardMetric["risk"] {
  if (score >= 85) return "Good";
  if (score >= 65) return "Watch";
  return "Critical";
}

function groupComplaints(items: AdminComplaint[], getKey: (item: AdminComplaint) => string): GroupedMetric[] {
  const map = new Map<string, GroupedMetric>();

  for (const item of items) {
    const key = getKey(item).trim() || "Not Assigned";
    const current = map.get(key) ?? {
      name: key,
      total: 0,
      pending: 0,
      resolved: 0,
      urgent: 0,
      overdue: 0,
    };

    current.total += 1;
    if (isComplaintPending(item)) current.pending += 1;
    if (item.status === "resolved") current.resolved += 1;
    if (item.priority === "urgent" || item.priority === "high") current.urgent += 1;
    if (isComplaintOverdue(item)) current.overdue += 1;

    map.set(key, current);
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.overdue - a.overdue ||
      b.urgent - a.urgent ||
      b.pending - a.pending ||
      b.total - a.total ||
      a.name.localeCompare(b.name),
  );
}

function buildWardMetrics(complaints: AdminComplaint[], certificates: CertificateApplicationRow[]): WardMetric[] {
  const map = new Map<string, Omit<WardMetric, "healthScore" | "risk">>();

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
      officePending: 0,
      overdue: 0,
    };
    map.set(key, current);
    return current;
  };

  for (const complaint of complaints) {
    const metric = getMetric(getComplaintWard(complaint));
    metric.complaints += 1;
    if (isComplaintPending(complaint)) metric.pendingComplaints += 1;
    if (complaint.priority === "urgent" || complaint.priority === "high") metric.urgentComplaints += 1;
    if (isComplaintOverdue(complaint)) metric.overdue += 1;
  }

  for (const certificate of certificates) {
    const metric = getMetric(getCertificateWard(certificate));
    metric.certificates += 1;
    if (isCertificatePending(certificate)) metric.pendingCertificates += 1;
    if (certificateCouncilorQueueStatuses.includes(certificate.status)) metric.councilorPending += 1;
    if (certificateOfficeQueueStatuses.includes(certificate.status)) metric.officePending += 1;
    if (isCertificateOverdue(certificate)) metric.overdue += 1;
  }

  return Array.from(map.values())
    .map((item) => {
      const healthScore = calculateHealthScore({
        pending: item.pendingComplaints + item.pendingCertificates,
        overdue: item.overdue,
        urgent: item.urgentComplaints,
        councilorPending: item.councilorPending,
        officePending: item.officePending,
      });
      return { ...item, healthScore, risk: riskFromScore(healthScore) };
    })
    .sort(
      (a, b) =>
        a.healthScore - b.healthScore ||
        b.overdue - a.overdue ||
        b.pendingComplaints + b.pendingCertificates - (a.pendingComplaints + a.pendingCertificates) ||
        a.ward.localeCompare(b.ward),
    );
}

function buildCouncilorMetrics(applications: CertificateApplicationRow[]): CouncilorMetric[] {
  const map = new Map<string, Omit<CouncilorMetric, "healthScore">>();

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
      current.oldestPendingDays = Math.max(current.oldestPendingDays, Math.floor(ageInDays(item.created_at)));
    }
    if (item.councilor_status === "verified" || item.status === "councilor_verified") current.verified += 1;
    if (item.councilor_status === "rejected" || item.status === "councilor_rejected") current.rejected += 1;
    if (certificateOfficeQueueStatuses.includes(item.status)) current.officeQueue += 1;

    map.set(ward, current);
  }

  return Array.from(map.values())
    .map((item) => ({
      ...item,
      healthScore: calculateHealthScore({
        pending: item.pending,
        overdue: item.oldestPendingDays >= 3 ? item.pending : 0,
        urgent: 0,
        officePending: item.officeQueue,
      }),
    }))
    .sort(
      (a, b) =>
        a.healthScore - b.healthScore ||
        b.pending - a.pending ||
        b.oldestPendingDays - a.oldestPendingDays ||
        a.ward.localeCompare(b.ward),
    );
}

function textIncludes(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function buildSearchResults(query: string, complaints: AdminComplaint[], certificates: CertificateApplicationRow[]): SearchResult[] {
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

function buildEscalationItems(complaints: AdminComplaint[], certificates: CertificateApplicationRow[]): EscalationItem[] {
  const map = new Map<string, EscalationItem>();

  for (const item of complaints) {
    if (!isComplaintPending(item)) continue;
    const isUrgent = item.priority === "urgent" || item.priority === "high";
    const isOverdue = isComplaintOverdue(item);
    const isUnassigned = !item.assigned_staff_id && !item.assigned_to;
    if (!isUrgent && !isOverdue && !isUnassigned) continue;

    const reason = isOverdue ? "Overdue complaint" : isUrgent ? "High priority" : "Unassigned";
    map.set(`complaint-${item.id}`, {
      id: item.id,
      type: "Complaint",
      trackingNo: item.tracking_no,
      citizen: item.full_name,
      ward: getComplaintWard(item),
      issue: categoryLabels[item.category] ?? item.category,
      reason,
      status: statusLabels[item.status],
      ageDays: Math.floor(ageInDays(item.created_at)),
      href: `/admin/complaints/${item.id}`,
      tone: isOverdue || isUrgent ? "danger" : "watch",
    });
  }

  for (const item of certificates) {
    if (!isCertificatePending(item)) continue;
    const overdue = isCertificateOverdue(item);
    const inCouncilorQueue = certificateCouncilorQueueStatuses.includes(item.status);
    const inOfficeQueue = certificateOfficeQueueStatuses.includes(item.status);
    if (!overdue && !inCouncilorQueue && !inOfficeQueue) continue;

    map.set(`certificate-${item.id}`, {
      id: item.id,
      type: "Certificate",
      trackingNo: item.tracking_no,
      citizen: item.subject_name,
      ward: getCertificateWard(item),
      issue: certificateTypeLabels[item.certificate_type],
      reason: overdue ? "Delayed certificate" : inCouncilorQueue ? "Councilor queue" : "Office queue",
      status: certificateStatusLabels[item.status],
      ageDays: Math.floor(ageInDays(item.created_at)),
      href: `/admin/certificates/${item.id}`,
      tone: overdue ? "danger" : "watch",
    });
  }

  return Array.from(map.values())
    .sort((a, b) => {
      const toneSort = (b.tone === "danger" ? 1 : 0) - (a.tone === "danger" ? 1 : 0);
      if (toneSort !== 0) return toneSort;
      return b.ageDays - a.ageDays;
    })
    .slice(0, 10);
}

export function ChairmanDashboard() {
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const [access, setAccess] = useState<AccessState>({ allowed: null, role: null });
  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [certificates, setCertificates] = useState<CertificateApplicationRow[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("30days");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificateWarning, setCertificateWarning] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const filteredComplaints = useMemo(() => complaints.filter((item) => isInDateRange(item.created_at, dateFilter)), [complaints, dateFilter]);
  const filteredCertificates = useMemo(
    () => certificates.filter((item) => isInDateRange(item.created_at, dateFilter)),
    [certificates, dateFilter],
  );

  const complaintAnalytics = useMemo(() => {
    const total = filteredComplaints.length;
    const submitted = filteredComplaints.filter((item) => item.status === "submitted").length;
    const received = filteredComplaints.filter((item) => item.status === "received").length;
    const inProgress = filteredComplaints.filter((item) => item.status === "in_progress").length;
    const resolved = filteredComplaints.filter((item) => item.status === "resolved").length;
    const rejected = filteredComplaints.filter((item) => item.status === "rejected").length;
    const notRelated = filteredComplaints.filter((item) => item.status === "not_related").length;
    const pending = submitted + received + inProgress;
    const urgent = filteredComplaints.filter((item) => item.priority === "urgent" || item.priority === "high").length;
    const overdue = filteredComplaints.filter(isComplaintOverdue).length;
    const unassigned = filteredComplaints.filter((item) => isComplaintPending(item) && !item.assigned_staff_id && !item.assigned_to).length;
    const closed = resolved + rejected + notRelated;
    const resolutionRate = total ? (resolved / total) * 100 : 0;
    const pendingRate = total ? (pending / total) * 100 : 0;
    const resolvedWithDates = filteredComplaints.filter((item) => item.status === "resolved" && item.resolved_at);
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
    const submitted = filteredCertificates.filter((item) => item.status === "submitted").length;
    const councilorReview = filteredCertificates.filter((item) => item.status === "councilor_review").length;
    const councilorVerified = filteredCertificates.filter((item) => item.status === "councilor_verified").length;
    const townReview = filteredCertificates.filter((item) => item.status === "town_review").length;
    const uploaded = filteredCertificates.filter((item) => item.status === "certificate_uploaded").length;
    const readyForCollection = filteredCertificates.filter((item) => item.status === "ready_for_collection").length;
    const delivered = filteredCertificates.filter((item) => item.status === "delivered").length;
    const rejected = filteredCertificates.filter((item) => item.status === "rejected").length;
    const needMoreInfo = filteredCertificates.filter((item) => item.status === "need_more_info").length;
    const councilorRejected = filteredCertificates.filter((item) => item.status === "councilor_rejected").length;
    const pending = filteredCertificates.filter(isCertificatePending).length;
    const councilorPending = filteredCertificates.filter((item) => certificateCouncilorQueueStatuses.includes(item.status)).length;
    const officePending = filteredCertificates.filter((item) => certificateOfficeQueueStatuses.includes(item.status)).length;
    const overdue = filteredCertificates.filter(isCertificateOverdue).length;
    const deliveryRate = total ? (delivered / total) * 100 : 0;

    return {
      total,
      submitted,
      councilorReview,
      councilorVerified,
      townReview,
      uploaded,
      readyForCollection,
      delivered,
      rejected,
      needMoreInfo,
      councilorRejected,
      pending,
      councilorPending,
      officePending,
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
    return groupComplaints(filteredComplaints, (item) => item.assigned_department || categoryLabels[item.category] || item.category).slice(0, 8);
  }, [filteredComplaints]);

  const staffMetrics = useMemo(() => {
    return groupComplaints(filteredComplaints, (item) => item.assigned_to || item.assigned_department || "Unassigned").slice(0, 8);
  }, [filteredComplaints]);

  const wardMetrics = useMemo(() => buildWardMetrics(filteredComplaints, filteredCertificates).slice(0, 10), [filteredComplaints, filteredCertificates]);
  const councilorMetrics = useMemo(() => buildCouncilorMetrics(filteredCertificates).slice(0, 8), [filteredCertificates]);

  const complaintStatusMetrics = useMemo(() => {
    return Object.entries(statusLabels).map(([status, label]) => ({
      label,
      status: status as ComplaintStatus,
      total: filteredComplaints.filter((item) => item.status === status).length,
    }));
  }, [filteredComplaints]);

  const certificateTypeMetrics = useMemo(() => {
    return (Object.entries(certificateTypeLabels) as Array<[CertificateType, string]>).map(([type, label]) => {
      const rows = filteredCertificates.filter((item) => item.certificate_type === type);
      return {
        label,
        total: rows.length,
        pending: rows.filter(isCertificatePending).length,
        delivered: rows.filter((item) => item.status === "delivered").length,
      };
    });
  }, [filteredCertificates]);

  const searchResults = useMemo(() => buildSearchResults(searchQuery, complaints, certificates), [searchQuery, complaints, certificates]);
  const escalationItems = useMemo(() => buildEscalationItems(filteredComplaints, filteredCertificates), [filteredComplaints, filteredCertificates]);

  const executiveHealthScore = useMemo(() => {
    return calculateHealthScore({
      pending: complaintAnalytics.pending + certificateAnalytics.pending,
      overdue: complaintAnalytics.overdue + certificateAnalytics.overdue,
      urgent: complaintAnalytics.urgent,
      councilorPending: certificateAnalytics.councilorPending,
      officePending: certificateAnalytics.officePending,
    });
  }, [complaintAnalytics, certificateAnalytics]);

  const certificatePipeline = useMemo<Array<{ label: string; value: number; helper: string; tone: Tone }>>(() => {
    return [
      { label: "Submitted", value: certificateAnalytics.submitted, helper: "New applications", tone: "neutral" as Tone },
      {
        label: "Ward Verification",
        value: certificateAnalytics.councilorPending,
        helper: "Councilor queue",
        tone: certificateAnalytics.councilorPending ? "watch" : "good",
      },
      {
        label: "Town Office",
        value: certificateAnalytics.councilorVerified + certificateAnalytics.townReview,
        helper: "Processing desk",
        tone: certificateAnalytics.officePending ? "civic" : "neutral",
      },
      {
        label: "Issue / Collection",
        value: certificateAnalytics.uploaded + certificateAnalytics.readyForCollection,
        helper: "Uploaded or ready",
        tone: certificateAnalytics.uploaded + certificateAnalytics.readyForCollection ? "info" : "neutral",
      },
      { label: "Delivered", value: certificateAnalytics.delivered, helper: formatPercent(certificateAnalytics.deliveryRate), tone: "good" as Tone },
      {
        label: "Exceptions",
        value: certificateAnalytics.needMoreInfo + certificateAnalytics.councilorRejected + certificateAnalytics.rejected,
        helper: "Rejected / correction",
        tone: certificateAnalytics.needMoreInfo + certificateAnalytics.councilorRejected + certificateAnalytics.rejected ? "danger" : "neutral",
      },
    ];
  }, [certificateAnalytics]);

  const attentionItems = useMemo<Array<{ title: string; value: number; helper: string; tone: Tone; href: string }>>(() => {
    return [
      {
        title: "Overdue complaints",
        value: complaintAnalytics.overdue,
        helper: "Pending more than 7 days",
        tone: complaintAnalytics.overdue ? "danger" : "good",
        href: "/admin",
      },
      {
        title: "Unassigned complaints",
        value: complaintAnalytics.unassigned,
        helper: "Need staff assignment",
        tone: complaintAnalytics.unassigned ? "watch" : "good",
        href: "/admin",
      },
      {
        title: "Urgent complaints",
        value: complaintAnalytics.urgent,
        helper: "High priority visible cases",
        tone: complaintAnalytics.urgent ? "danger" : "neutral",
        href: "/admin",
      },
      {
        title: "Councilor queue",
        value: certificateAnalytics.councilorPending,
        helper: "Ward verification pending",
        tone: certificateAnalytics.councilorPending ? "watch" : "good",
        href: "/admin/certificates",
      },
      {
        title: "Office queue",
        value: certificateAnalytics.officePending,
        helper: "Town office processing",
        tone: certificateAnalytics.officePending ? "civic" : "neutral",
        href: "/admin/certificates/final-processing",
      },
      {
        title: "Delayed certificates",
        value: certificateAnalytics.overdue,
        helper: "Beyond expected review time",
        tone: certificateAnalytics.overdue ? "danger" : "good",
        href: "/admin/certificates",
      },
    ];
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
      const [complaintRows, certificateResult] = await Promise.allSettled([fetchAdminComplaints(), fetchCertificateApplications()]);

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

      setLastUpdatedAt(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Chairman Executive Dashboard v2.");
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
    <section className="bg-slate-50/80">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        {loading && sessionState === "checking" ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking chairman dashboard access...
          </div>
        ) : null}

        {sessionState === "signed-in" && !allowed ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h1 className="text-xl font-black">Access denied</h1>
            <p className="mt-2 text-sm">Chairman Executive Dashboard is available only for accounts assigned as chairman or admin.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/admin" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-800 ring-1 ring-rose-200">
                Back to Admin
              </Link>
              <button type="button" onClick={handleLogout} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">
                Logout
              </button>
            </div>
          </div>
        ) : null}

        {allowed ? (
          <>
            <div className="mb-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full bg-civic-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-civic-800 ring-1 ring-civic-100">
                    Chairman Executive Dashboard v2
                  </div>
                  <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Service Delivery Command Center
                  </h1>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                    Compact monitoring for complaints, certificates, ward performance, SLA risk and chairman-level escalation.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                    <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">Role: {access.role ?? "authorized"}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">Range: {rangeLabels[dateFilter]}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                      Last updated: {lastUpdatedAt ? formatDateTime(lastUpdatedAt) : "Not refreshed yet"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <TopAction to="/admin" icon={<ArrowLeft className="h-4 w-4" />} label="Admin" />
                  <TopAction to="/admin/certificates" icon={<BadgeCheck className="h-4 w-4" />} label="Certificates" />
                  <TopAction to="/admin/reports" icon={<FileText className="h-4 w-4" />} label="Reports" />
                  <button type="button" onClick={loadDashboard} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                  </button>
                  <button type="button" onClick={handleLogout} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_460px]">
                <div className="grid gap-2 sm:grid-cols-5">
                  {(Object.entries(rangeLabels) as Array<[DateFilter, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDateFilter(value)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm font-black transition ${
                        dateFilter === value
                          ? "border-civic-700 bg-civic-700 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <label className="relative block">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search tracking no, citizen, CNIC, mobile, ward..."
                    className="h-full min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-civic-500 focus:ring-4 focus:ring-civic-100"
                  />
                </label>
              </div>
            </div>

            {searchQuery.trim().length >= 2 ? <SearchResultPanel results={searchResults} /> : null}

            {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
            {certificateWarning ? (
              <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
                Certificate monitoring warning: {certificateWarning}
              </p>
            ) : null}
            {loading ? (
              <div className="mb-4 flex justify-center rounded-3xl border border-slate-200 bg-white py-8 text-slate-500 shadow-sm">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading executive dashboard data...
              </div>
            ) : null}

            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <ExecutiveKpiCard icon={<Clock3 className="h-5 w-5" />} label="Pending Complaints" value={complaintAnalytics.pending} helper={formatPercent(complaintAnalytics.pendingRate)} tone={complaintAnalytics.pending ? "watch" : "good"} />
              <ExecutiveKpiCard icon={<FileWarning className="h-5 w-5" />} label="Overdue Complaints" value={complaintAnalytics.overdue} helper="7+ days" tone={complaintAnalytics.overdue ? "danger" : "good"} />
              <ExecutiveKpiCard icon={<ShieldAlert className="h-5 w-5" />} label="Urgent Cases" value={complaintAnalytics.urgent} helper="High priority" tone={complaintAnalytics.urgent ? "danger" : "neutral"} />
              <ExecutiveKpiCard icon={<BadgeCheck className="h-5 w-5" />} label="Pending Certificates" value={certificateAnalytics.pending} helper={`${certificateAnalytics.total} total`} tone={certificateAnalytics.pending ? "civic" : "good"} />
              <ExecutiveKpiCard icon={<Users className="h-5 w-5" />} label="Councilor Delay" value={certificateAnalytics.councilorPending} helper="Ward verification" tone={certificateAnalytics.councilorPending ? "watch" : "good"} />
              <ExecutiveKpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Resolved / Delivered" value={complaintAnalytics.resolved + certificateAnalytics.delivered} helper={`${formatPercent(complaintAnalytics.resolutionRate)} / ${formatPercent(certificateAnalytics.deliveryRate)}`} tone="good" />
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
              <CriticalAttentionBoard items={attentionItems} />
              <OperationalSnapshot
                healthScore={executiveHealthScore}
                complaintAnalytics={complaintAnalytics}
                certificateAnalytics={certificateAnalytics}
                calendarStats={calendarStats}
              />
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
              <Panel title="Ward Performance Ranking" description="Lowest health score appears first so weak wards are visible immediately." icon={<MapPinned className="h-5 w-5" />}>
                <WardRankingBoard metrics={wardMetrics} />
              </Panel>

              <Panel title="Certificate Pipeline" description="Certificate flow from application submission to delivery." icon={<Layers3 className="h-5 w-5" />}>
                <CertificatePipeline steps={certificatePipeline} />
                <CertificateTypeSummary items={certificateTypeMetrics} />
              </Panel>
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-2">
              <Panel title="Department SLA Performance" description="Departments/categories with pending, overdue and priority workload." icon={<Building2 className="h-5 w-5" />}>
                <DepartmentSlaTable metrics={departmentMetrics} />
              </Panel>

              <Panel title="Staff & Councilor Performance" description="Assignment pressure and ward verification workload." icon={<Users className="h-5 w-5" />}>
                <div className="grid gap-3 2xl:grid-cols-2">
                  <StaffWorkloadList metrics={staffMetrics} />
                  <CouncilorPerformanceList metrics={councilorMetrics} />
                </div>
              </Panel>
            </div>

            <div className="mb-4 grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
              <Panel title="Escalation Center" description="Action list for oldest, urgent, unassigned or delayed cases." icon={<AlertTriangle className="h-5 w-5" />}>
                <EscalationTable items={escalationItems} />
              </Panel>

              <Panel title="Status Distribution" description="Compact health view for complaints and office reports." icon={<ClipboardCheck className="h-5 w-5" />}>
                <ComplaintStatusCompact metrics={complaintStatusMetrics} total={complaintAnalytics.total} />
              </Panel>
            </div>

            <ReportsAndActions />
          </>
        ) : null}
      </div>
    </section>
  );
}

function TopAction({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link to={to} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
      <span className="mr-2">{icon}</span>
      {label}
    </Link>
  );
}

function toneClasses(tone: Tone) {
  if (tone === "danger") return "border-rose-200 bg-rose-50 text-rose-900 ring-rose-100";
  if (tone === "watch") return "border-amber-200 bg-amber-50 text-amber-900 ring-amber-100";
  if (tone === "good") return "border-emerald-200 bg-emerald-50 text-emerald-900 ring-emerald-100";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-900 ring-blue-100";
  if (tone === "civic") return "border-civic-200 bg-civic-50 text-civic-900 ring-civic-100";
  return "border-slate-200 bg-slate-50 text-slate-900 ring-slate-100";
}

function toneIconClasses(tone: Tone) {
  if (tone === "danger") return "bg-rose-50 text-rose-700";
  if (tone === "watch") return "bg-amber-50 text-amber-700";
  if (tone === "good") return "bg-emerald-50 text-emerald-700";
  if (tone === "info") return "bg-blue-50 text-blue-700";
  if (tone === "civic") return "bg-civic-50 text-civic-800";
  return "bg-slate-50 text-slate-700";
}

function riskBadgeClasses(risk: WardMetric["risk"]) {
  if (risk === "Critical") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (risk === "Watch") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}

function ExecutiveKpiCard({ icon, label, value, helper, tone = "neutral" }: { icon: ReactNode; label: string; value: number | string; helper: string; tone?: Tone }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-2xl p-3 ${toneIconClasses(tone)}`}>{icon}</div>
        <p className="text-right text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black leading-none text-slate-950">{value}</p>
        <p className="text-right text-xs font-bold text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function Panel({ title, description, icon, children }: { title: string; description: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        {icon ? <div className="rounded-2xl bg-civic-50 p-3 text-civic-800">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, tone = "civic" }: { value: number; tone?: Tone }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const color = tone === "danger" ? "bg-rose-600" : tone === "watch" ? "bg-amber-500" : tone === "good" ? "bg-emerald-600" : "bg-civic-700";

  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function SearchResultPanel({ results }: { results: SearchResult[] }) {
  return (
    <div className="mb-4 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Search Results</h2>
        <span className="text-xs font-bold text-slate-400">{results.length} found</span>
      </div>
      {results.length ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {results.map((item) => (
            <Link key={`${item.type}-${item.id}`} to={item.href} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-civic-200 hover:bg-civic-50">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-black text-slate-950">{item.trackingNo}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{item.subtitle}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase text-slate-600 ring-1 ring-slate-200">{item.type}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{item.status} · {formatDate(item.createdAt)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No matching complaint or certificate found.</p>
      )}
    </div>
  );
}

function CriticalAttentionBoard({ items }: { items: Array<{ title: string; value: number; helper: string; tone: Tone; href: string }> }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Critical Attention Board</h2>
            <p className="mt-1 text-sm text-slate-500">Chairman should review these signals before routine work.</p>
          </div>
        </div>
        <Link to="/admin/reports" className="inline-flex items-center text-sm font-black text-civic-800 hover:text-civic-900">
          Reports <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link key={item.title} to={item.href} className={`rounded-2xl border p-4 ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClasses(item.tone)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black">{item.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{item.helper}</p>
              </div>
              <p className="text-3xl font-black leading-none">{item.value}</p>
            </div>
            <div className="mt-3 inline-flex items-center text-xs font-black uppercase tracking-wide opacity-75">
              Open queue <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function OperationalSnapshot({
  healthScore,
  complaintAnalytics,
  certificateAnalytics,
  calendarStats,
}: {
  healthScore: number;
  complaintAnalytics: {
    total: number;
    pending: number;
    resolved: number;
    resolutionRate: number;
    averageResolutionDays: number;
  };
  certificateAnalytics: {
    total: number;
    pending: number;
    delivered: number;
    deliveryRate: number;
  };
  calendarStats: {
    complaintsToday: number;
    complaintsWeek: number;
    complaintsMonth: number;
    certificatesToday: number;
    certificatesWeek: number;
    certificatesMonth: number;
  };
}) {
  const healthTone: Tone = healthScore >= 85 ? "good" : healthScore >= 65 ? "watch" : "danger";

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-3 ${toneIconClasses(healthTone)}`}>
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950">Executive Snapshot</h2>
          <p className="mt-1 text-sm text-slate-500">Overall service health and daily inflow.</p>
        </div>
      </div>

      <div className={`mt-4 rounded-2xl border p-4 ${toneClasses(healthTone)}`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black">Service Health Score</p>
            <p className="mt-1 text-xs font-semibold opacity-75">Based on pending, overdue, urgent and queue risk.</p>
          </div>
          <p className="text-4xl font-black leading-none">{healthScore}</p>
        </div>
        <ProgressBar value={healthScore} tone={healthTone} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <SnapshotMini label="Complaints today" value={calendarStats.complaintsToday} />
        <SnapshotMini label="Certificates today" value={calendarStats.certificatesToday} />
        <SnapshotMini label="Complaints 7 days" value={calendarStats.complaintsWeek} />
        <SnapshotMini label="Certificates 7 days" value={calendarStats.certificatesWeek} />
        <SnapshotMini label="Complaint resolution" value={formatPercent(complaintAnalytics.resolutionRate)} />
        <SnapshotMini label="Certificate delivery" value={formatPercent(certificateAnalytics.deliveryRate)} />
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500 ring-1 ring-slate-100">
        Complaints: {complaintAnalytics.total} total, {complaintAnalytics.pending} pending, {complaintAnalytics.resolved} resolved. Certificates: {certificateAnalytics.total} total, {certificateAnalytics.pending} pending, {certificateAnalytics.delivered} delivered. Avg complaint resolution: {complaintAnalytics.averageResolutionDays ? `${complaintAnalytics.averageResolutionDays.toFixed(1)} days` : "not enough data"}.
      </div>
    </div>
  );
}

function SnapshotMini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function WardRankingBoard({ metrics }: { metrics: WardMetric[] }) {
  if (!metrics.length) {
    return (
      <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 ring-1 ring-slate-100">
        No ward-level records found. Add ward and muhallah master data to show all 10 wards, even when workload is zero.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ward</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Complaints</th>
              <th className="px-4 py-3">Certificates</th>
              <th className="px-4 py-3">Queues</th>
              <th className="px-4 py-3">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {metrics.map((item) => (
              <tr key={item.ward}>
                <td className="px-4 py-3 font-black text-slate-950">{item.ward}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-10 font-black text-slate-950">{item.healthScore}</span>
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${item.healthScore >= 85 ? "bg-emerald-600" : item.healthScore >= 65 ? "bg-amber-500" : "bg-rose-600"}`} style={{ width: `${item.healthScore}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.complaints} total · {item.pendingComplaints} pending · {item.urgentComplaints} urgent</td>
                <td className="px-4 py-3 text-slate-600">{item.certificates} total · {item.pendingCertificates} pending</td>
                <td className="px-4 py-3 text-slate-600">Councilor {item.councilorPending} · Office {item.officePending}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${riskBadgeClasses(item.risk)}`}>{item.risk}</span>
                  {item.overdue ? <span className="ml-2 text-xs font-black text-rose-700">Overdue {item.overdue}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 bg-slate-50 p-3 xl:hidden">
        {metrics.map((item) => (
          <div key={item.ward} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{item.ward}</p>
                <p className="mt-1 text-xs text-slate-500">Complaints {item.complaints} · Certificates {item.certificates}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${riskBadgeClasses(item.risk)}`}>{item.risk}</span>
            </div>
            <ProgressBar value={item.healthScore} tone={item.healthScore >= 85 ? "good" : item.healthScore >= 65 ? "watch" : "danger"} />
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
              <p>Pending complaints: <b>{item.pendingComplaints}</b></p>
              <p>Urgent: <b>{item.urgentComplaints}</b></p>
              <p>Councilor queue: <b>{item.councilorPending}</b></p>
              <p>Overdue: <b>{item.overdue}</b></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertificatePipeline({ steps }: { steps: Array<{ label: string; value: number; helper: string; tone: Tone }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step.label} className={`rounded-2xl border p-4 ring-1 ${toneClasses(step.tone)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wide opacity-70">Step {index + 1}</p>
              <p className="mt-1 text-sm font-black">{step.label}</p>
              <p className="mt-1 text-xs font-semibold opacity-70">{step.helper}</p>
            </div>
            <p className="text-3xl font-black leading-none">{step.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CertificateTypeSummary({ items }: { items: Array<{ label: string; total: number; pending: number; delivered: number }> }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm font-black text-slate-950">{item.label}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{item.total}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Pending {item.pending} · Delivered {item.delivered}</p>
        </div>
      ))}
    </div>
  );
}

function DepartmentSlaTable({ metrics }: { metrics: GroupedMetric[] }) {
  if (!metrics.length) {
    return <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No department data found.</p>;
  }

  return (
    <div className="space-y-3">
      {metrics.map((item) => {
        const status: "Critical" | "At Risk" | "Normal" = item.overdue ? "Critical" : item.pending || item.urgent ? "At Risk" : "Normal";
        const tone: Tone = status === "Critical" ? "danger" : status === "At Risk" ? "watch" : "good";
        const resolvedRate = item.total ? (item.resolved / item.total) * 100 : 0;

        return (
          <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-black text-slate-950">{item.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Total {item.total} · Pending {item.pending} · Overdue {item.overdue} · Priority {item.urgent}</p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClasses(tone)}`}>{status}</span>
            </div>
            <ProgressBar value={resolvedRate} tone={tone} />
            <p className="mt-1 text-xs font-semibold text-slate-500">Resolved rate: {formatPercent(resolvedRate)}</p>
          </div>
        );
      })}
    </div>
  );
}

function StaffWorkloadList({ metrics }: { metrics: GroupedMetric[] }) {
  if (!metrics.length) return <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No staff assignment data found.</p>;

  return (
    <div>
      <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Staff workload</h3>
      <div className="space-y-3">
        {metrics.slice(0, 5).map((item) => (
          <div key={item.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">Pending {item.pending} · Resolved {item.resolved}</p>
              </div>
              <p className="text-2xl font-black text-slate-950">{item.total}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CouncilorPerformanceList({ metrics }: { metrics: CouncilorMetric[] }) {
  if (!metrics.length) return <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">No councilor verification data found.</p>;

  return (
    <div>
      <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Councilor verification</h3>
      <div className="space-y-3">
        {metrics.slice(0, 5).map((item) => (
          <div key={item.ward} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">{item.ward}</p>
                <p className="mt-1 text-xs text-slate-500">Verified {item.verified} · Rejected {item.rejected} · Office {item.officeQueue}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-slate-950">{item.pending}</p>
                <p className="text-xs font-semibold text-slate-500">pending</p>
              </div>
            </div>
            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-100">
              Oldest pending: {item.oldestPendingDays ? `${item.oldestPendingDays} days` : "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscalationTable({ items }: { items: EscalationItem[] }) {
  if (!items.length) {
    return <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No escalation items in selected range.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Case</th>
              <th className="px-4 py-3">Citizen</th>
              <th className="px-4 py-3">Ward / Issue</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item) => (
              <tr key={`${item.type}-${item.id}`}>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs font-black text-slate-950">{item.trackingNo}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{item.type} · {item.status}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{item.citizen}</td>
                <td className="px-4 py-3 text-slate-600">{item.ward}<br /><span className="text-xs text-slate-400">{item.issue}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClasses(item.tone)}`}>{item.reason}</span></td>
                <td className="px-4 py-3 font-black text-slate-950">{item.ageDays <= 0 ? "Today" : `${item.ageDays}d`}</td>
                <td className="px-4 py-3">
                  <Link to={item.href} className="inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-black text-white hover:bg-civic-800">
                    Open <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 bg-slate-50 p-3 xl:hidden">
        {items.map((item) => (
          <Link key={`${item.type}-${item.id}`} to={item.href} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-black text-slate-950">{item.trackingNo}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{item.citizen}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClasses(item.tone)}`}>{item.reason}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">{item.type} · {item.status} · {item.ward}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{item.issue} · Age {item.ageDays <= 0 ? "Today" : `${item.ageDays} days`}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ComplaintStatusCompact({ metrics, total }: { metrics: Array<{ label: string; status: ComplaintStatus; total: number }>; total: number }) {
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

function ReportsAndActions() {
  const actions = [
    { to: "/admin", title: "Complaint Queue", helper: "Assignment and status follow-up", icon: <BarChart3 className="h-5 w-5" /> },
    { to: "/admin/certificates", title: "Certificate Queue", helper: "Birth, marriage and death applications", icon: <BadgeCheck className="h-5 w-5" /> },
    { to: "/admin/certificates/final-processing", title: "Final Processing", helper: "Town Office issuance desk", icon: <ClipboardCheck className="h-5 w-5" /> },
    { to: "/admin/reports", title: "Official Reports", helper: "Ward and department reports", icon: <FileText className="h-5 w-5" /> },
    { to: "/admin/users", title: "Role Review", helper: "Admin and staff access check", icon: <Users className="h-5 w-5" /> },
    { to: "/admin/ward-councilors", title: "Ward Councilors", helper: "Verification assignment review", icon: <ListChecks className="h-5 w-5" /> },
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-2xl bg-civic-50 p-3 text-civic-800">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-950">Executive Actions & Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Fast paths for official review, follow-up and meeting preparation.</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {actions.map((item) => (
          <Link key={item.to} to={item.to} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-civic-200 hover:bg-civic-50">
            <div className="mb-3 rounded-2xl bg-white p-3 text-civic-800 ring-1 ring-slate-100 w-fit">{item.icon}</div>
            <p className="font-black text-slate-950">{item.title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.helper}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
