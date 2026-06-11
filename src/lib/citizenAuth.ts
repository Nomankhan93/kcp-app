import { supabase } from "./supabase";
import type {
  CertificateDocumentKind,
  CitizenCertificateDetailRow,
  CitizenCertificateDocumentRow,
  CitizenCertificateSummaryRow,
  CitizenComplaintDetailRow,
  CitizenComplaintSummaryRow,
  CitizenComplaintTimelineRow,
  CitizenNotificationRow,
  CitizenProfileRow,
} from "./types";

export type CitizenAuthState = {
  signedIn: boolean;
  userId: string | null;
  email: string | null;
};

export type CitizenProfileInput = {
  fullName: string;
  mobile: string;
  cnic?: string;
  address?: string;
  area?: string;
  ward?: string;
  mohalla?: string;
};

export type CitizenClaimType = "complaint" | "certificate";

export type CitizenClaimResult = {
  claimed: boolean;
  message: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function getCitizenAuthState(): Promise<CitizenAuthState> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { signedIn: false, userId: null, email: null };
  }

  return {
    signedIn: true,
    userId: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function signUpCitizen(
  email: string,
  password: string,
  fullName: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (error) throw error;

  if (data.session) {
    await saveCitizenProfile({ fullName, mobile: "" });
  }

  return data;
}

export async function signInCitizen(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw error;
}

export async function signOutCitizen() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchCitizenProfile(): Promise<CitizenProfileRow | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("citizen_profiles")
    .select(
      "user_id, full_name, mobile, cnic, address, area, ward, mohalla, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as CitizenProfileRow | null;
}

export async function saveCitizenProfile(
  input: CitizenProfileInput,
): Promise<CitizenProfileRow> {
  const { data, error } = await supabase.rpc("upsert_citizen_profile_v1", {
    p_full_name: input.fullName.trim(),
    p_mobile: input.mobile.trim(),
    p_cnic: input.cnic?.trim() || null,
    p_address: input.address?.trim() || null,
    p_area: input.area?.trim() || null,
    p_ward: input.ward?.trim() || null,
    p_mohalla: input.mohalla?.trim() || null,
  });

  if (error) throw error;
  return data as CitizenProfileRow;
}

export async function fetchMyCitizenComplaints(): Promise<
  CitizenComplaintSummaryRow[]
> {
  const { data, error } = await supabase.rpc("get_my_citizen_complaints_v1");
  if (error) throw error;
  return (data ?? []) as CitizenComplaintSummaryRow[];
}

export async function fetchMyCitizenCertificates(): Promise<
  CitizenCertificateSummaryRow[]
> {
  const { data, error } = await supabase.rpc("get_my_citizen_certificates_v1");
  if (error) throw error;
  return (data ?? []) as CitizenCertificateSummaryRow[];
}

export async function claimCitizenRecord(
  type: CitizenClaimType,
  trackingNo: string,
  mobile: string,
): Promise<CitizenClaimResult> {
  const { data, error } = await supabase.rpc("claim_citizen_record_v1", {
    p_record_type: type,
    p_tracking_no: trackingNo.trim(),
    p_mobile: mobile.trim(),
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    claimed: Boolean(row?.claimed),
    message: asText(row?.message) ?? "Record claim request completed.",
  };
}

export function formatCitizenStatus(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function calculateProfileCompletion(profile: CitizenProfileRow | null) {
  if (!profile) return 0;

  const requiredFields = [
    profile.full_name,
    profile.mobile,
    profile.cnic,
    profile.address,
    profile.ward,
    profile.mohalla,
  ];
  const completed = requiredFields.filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  ).length;
  return Math.round((completed / requiredFields.length) * 100);
}

export function isCitizenActionRequired(status: string) {
  return status === "need_more_info";
}

export async function fetchCitizenNotifications(): Promise<
  CitizenNotificationRow[]
> {
  const { data, error } = await supabase.rpc("get_my_citizen_notifications_v1");
  if (error) throw error;
  return (data ?? []) as CitizenNotificationRow[];
}

export async function markCitizenNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_my_citizen_notifications_read_v1");
  if (error) throw error;
}

export async function fetchMyCitizenComplaintDetail(
  id: string,
): Promise<CitizenComplaintDetailRow | null> {
  const { data, error } = await supabase.rpc(
    "get_my_citizen_complaint_detail_v1",
    {
      p_complaint_id: id,
    },
  );

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as CitizenComplaintDetailRow | null;
}

export async function fetchMyCitizenComplaintTimeline(
  id: string,
): Promise<CitizenComplaintTimelineRow[]> {
  const { data, error } = await supabase.rpc(
    "get_my_citizen_complaint_timeline_v1",
    {
      p_complaint_id: id,
    },
  );

  if (error) throw error;
  return (data ?? []) as CitizenComplaintTimelineRow[];
}

export async function fetchMyCitizenCertificateDetail(
  id: string,
): Promise<CitizenCertificateDetailRow | null> {
  const { data, error } = await supabase.rpc(
    "get_my_citizen_certificate_detail_v1",
    {
      p_application_id: id,
    },
  );

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? null) as CitizenCertificateDetailRow | null;
}

export async function fetchMyCitizenCertificateTimeline(id: string) {
  const { data, error } = await supabase.rpc(
    "get_my_citizen_certificate_timeline_v1",
    {
      p_application_id: id,
    },
  );

  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    application_id: string;
    status: string;
    public_remarks: string | null;
    changed_at: string;
  }>;
}

export async function fetchMyCitizenCertificateDocuments(
  id: string,
): Promise<CitizenCertificateDocumentRow[]> {
  const { data, error } = await supabase
    .from("certificate_documents")
    .select(
      "id, application_id, kind, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at",
    )
    .eq("application_id", id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CitizenCertificateDocumentRow[];
}

function safeExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
  return ["jpg", "jpeg", "png", "webp", "pdf"].includes(extension)
    ? extension
    : "pdf";
}

export function validateCitizenCorrectionDocument(file: File) {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, WEBP or PDF files are allowed.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Document must be 10MB or smaller.");
  }
}

export async function uploadCitizenCorrectionDocument(file: File) {
  validateCitizenCorrectionDocument(file);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Login required before uploading documents.");

  const path = `citizen-corrections/${userId}/${crypto.randomUUID()}.${safeExtension(file)}`;
  const { error } = await supabase.storage
    .from("certificate-documents")
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return {
    kind: "other" as CertificateDocumentKind,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  };
}

export async function submitCitizenCertificateCorrection(input: {
  applicationId: string;
  response: string;
  files: File[];
}) {
  const uploadedDocuments = [];
  for (const file of input.files) {
    uploadedDocuments.push(await uploadCitizenCorrectionDocument(file));
  }

  const { error } = await supabase.rpc(
    "citizen_respond_certificate_need_more_info_v1",
    {
      p_application_id: input.applicationId,
      p_response: input.response.trim(),
      p_documents: uploadedDocuments,
    },
  );

  if (error) throw error;
}

export async function createCitizenCertificateDocumentSignedUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("certificate-documents")
    .createSignedUrl(path, 60 * 10);
  if (error) {
    console.warn(
      "Unable to create citizen document signed URL.",
      error.message,
    );
    return null;
  }

  return data?.signedUrl ?? null;
}
