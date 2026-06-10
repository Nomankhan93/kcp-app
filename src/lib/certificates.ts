import { defaultCitizenAreas } from './constants';
import { supabase } from './supabase';
import type {
  CertificateApplicationRow,
  CertificateApplicationStatus,
  CertificateDocumentKind,
  CertificateDocumentRow,
  CertificateStatusHistoryRow,
  CertificateType,
  CitizenAreaRow,
  PublicCertificateApplication,
  WardCouncilorRow,
} from './types';

export type CertificateSessionCheck = {
  signedIn: boolean;
  allowed: boolean;
  role: 'admin' | 'chairman' | 'staff' | 'general_councilor' | null;
};

export type CertificateUploadFile = {
  kind: CertificateDocumentKind;
  file: File;
};

export type UploadedCertificateDocument = {
  kind: CertificateDocumentKind;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

export type SubmitCertificateApplicationInput = {
  certificateType: CertificateType;
  applicantName: string;
  applicantMobile: string;
  applicantCnic?: string;
  applicantRelation?: string;
  applicantAddress: string;
  area: string;
  ward: string;
  mohalla?: string;
  subjectName: string;
  subjectCnic?: string;
  eventDate: string;
  eventPlace: string;
  formData: Record<string, string>;
  documents: CertificateUploadFile[];
};

export type CertificateTrackingResult = {
  application: PublicCertificateApplication | null;
  timeline: CertificateStatusHistoryRow[];
};

export type AdminCertificateUpdateInput = {
  id: string;
  status: CertificateApplicationStatus;
  councilorStatus: 'pending' | 'verified' | 'rejected';
  assignedCouncilorId: string | null;
  councilorRemarks: string | null;
  townRemarks: string | null;
  publicRemarks: string | null;
  certificateNumber: string | null;
  issuedCertificatePath: string | null;
};

const MAX_CERTIFICATE_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const allowedCertificateFileTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function normalizePhone(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function normalizeTrackingNo(value: string) {
  return value.trim().toUpperCase();
}

function emptyToNull(value?: string | null) {
  const clean = value?.trim() ?? '';
  return clean.length ? clean : null;
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function safeExtension(fileName: string, mimeType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) return ext;
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export function validateCertificateDocument(file: File) {
  if (!allowedCertificateFileTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, WEBP or PDF files are allowed.');
  }

  if (file.size > MAX_CERTIFICATE_FILE_SIZE_BYTES) {
    throw new Error('Each certificate document must be 10MB or smaller.');
  }
}

export async function checkCertificateAccess(): Promise<CertificateSessionCheck> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return { signedIn: false, allowed: false, role: null };
  }

  const { data: roleData, error } = await supabase.rpc('current_portal_role');
  const role = asText(roleData) as CertificateSessionCheck['role'];

  if (!error && (role === 'admin' || role === 'chairman' || role === 'staff' || role === 'general_councilor')) {
    return { signedIn: true, allowed: true, role };
  }

  return { signedIn: true, allowed: false, role: null };
}

export async function getCertificateAreas(): Promise<CitizenAreaRow[]> {
  const { data, error } = await supabase
    .from('citizen_areas')
    .select('id, name, ward, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Unable to load citizen areas for certificate form. Using defaults.', error.message);
    return defaultCitizenAreas;
  }

  return data?.length ? (data as CitizenAreaRow[]) : defaultCitizenAreas;
}

async function uploadCertificateApplicantDocument(kind: CertificateDocumentKind, file: File): Promise<UploadedCertificateDocument> {
  validateCertificateDocument(file);

  const extension = safeExtension(file.name, file.type);
  const path = `applicant-documents/${new Date().getFullYear()}/${crypto.randomUUID()}-${kind}.${extension}`;

  const { error } = await supabase.storage.from('certificate-documents').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  return {
    kind,
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  };
}

export async function uploadIssuedCertificateFile(applicationId: string, file: File): Promise<UploadedCertificateDocument> {
  validateCertificateDocument(file);

  const extension = safeExtension(file.name, file.type);
  const path = `issued-certificates/${new Date().getFullYear()}/${applicationId}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from('certificate-documents').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  return {
    kind: 'issued_certificate',
    storage_path: path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
  };
}

export async function submitCertificateApplication(input: SubmitCertificateApplicationInput): Promise<string> {
  if (input.documents.length === 0) {
    throw new Error('Please upload required supporting documents.');
  }

  const uploadedDocuments: UploadedCertificateDocument[] = [];

  for (const item of input.documents) {
    uploadedDocuments.push(await uploadCertificateApplicantDocument(item.kind, item.file));
  }

  const { data, error } = await supabase.rpc('submit_certificate_application_v1', {
    p_certificate_type: input.certificateType,
    p_applicant_name: input.applicantName.trim(),
    p_applicant_mobile: normalizePhone(input.applicantMobile),
    p_applicant_cnic: emptyToNull(input.applicantCnic),
    p_applicant_relation: emptyToNull(input.applicantRelation),
    p_applicant_address: input.applicantAddress.trim(),
    p_area: input.area.trim(),
    p_ward: input.ward.trim(),
    p_mohalla: emptyToNull(input.mohalla),
    p_subject_name: input.subjectName.trim(),
    p_subject_cnic: emptyToNull(input.subjectCnic),
    p_event_date: input.eventDate,
    p_event_place: input.eventPlace.trim(),
    p_form_data: input.formData,
    p_documents: uploadedDocuments,
  });

  if (error) throw error;

  const trackingNo = Array.isArray(data) ? data[0]?.tracking_no : data?.tracking_no;
  if (!trackingNo) throw new Error('Application submitted, but tracking number was not returned.');

  return trackingNo;
}

export async function trackCertificateApplication(trackingNo: string, mobile: string): Promise<CertificateTrackingResult> {
  const payload = {
    p_tracking_no: normalizeTrackingNo(trackingNo),
    p_mobile: normalizePhone(mobile),
  };

  const v2Result = await supabase.rpc('get_certificate_public_v2', payload);
  const { data, error } = v2Result.error ? await supabase.rpc('get_certificate_public_v1', payload) : v2Result;

  if (error) throw error;

  const application = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

  if (!application) {
    return { application: null, timeline: [] };
  }

  const { data: timelineData, error: timelineError } = await supabase.rpc('get_certificate_public_timeline_v1', payload);

  return {
    application: application as PublicCertificateApplication,
    timeline: timelineError ? [] : ((timelineData ?? []) as CertificateStatusHistoryRow[]),
  };
}

export async function fetchCertificateApplications(): Promise<CertificateApplicationRow[]> {
  const { data, error } = await supabase
    .from('certificate_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateApplicationRow[];
}

export async function fetchCertificateApplication(id: string): Promise<CertificateApplicationRow | null> {
  const { data, error } = await supabase.from('certificate_applications').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return (data ?? null) as CertificateApplicationRow | null;
}

export async function fetchCertificateDocuments(applicationId: string): Promise<CertificateDocumentRow[]> {
  const { data, error } = await supabase
    .from('certificate_documents')
    .select('id, application_id, kind, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as CertificateDocumentRow[];
}

export async function fetchCertificateHistory(applicationId: string): Promise<CertificateStatusHistoryRow[]> {
  const { data, error } = await supabase
    .from('certificate_status_history')
    .select('id, application_id, status, public_remarks, internal_remarks, changed_by, changed_at')
    .eq('application_id', applicationId)
    .order('changed_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateStatusHistoryRow[];
}

export async function fetchWardCouncilors(): Promise<WardCouncilorRow[]> {
  const { data, error } = await supabase
    .from('ward_councilors')
    .select('id, user_id, full_name, ward, mobile, designation, is_active')
    .eq('is_active', true)
    .order('ward', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) {
    console.warn('Unable to load ward councilors.', error.message);
    return [];
  }

  return (data ?? []) as WardCouncilorRow[];
}

export async function createCertificateDocumentSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage.from('certificate-documents').createSignedUrl(path, 60 * 10);

  if (error) {
    console.warn('Unable to create signed URL for certificate document.', error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function createIssuedCertificateSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage.from('certificate-documents').createSignedUrl(path, 60 * 15);

  if (error) {
    console.warn('Unable to create signed URL for issued certificate.', error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function updateCertificateApplication(input: AdminCertificateUpdateInput, issuedFile?: UploadedCertificateDocument | null) {
  const { error } = await supabase.rpc('admin_update_certificate_application_v1', {
    p_application_id: input.id,
    p_status: input.status,
    p_councilor_status: input.councilorStatus,
    p_assigned_councilor_id: input.assignedCouncilorId,
    p_councilor_remarks: input.councilorRemarks,
    p_town_remarks: input.townRemarks,
    p_public_remarks: input.publicRemarks,
    p_certificate_number: input.certificateNumber,
    p_issued_certificate_path: input.issuedCertificatePath,
    p_issued_file_name: issuedFile?.file_name ?? null,
    p_issued_mime_type: issuedFile?.mime_type ?? null,
    p_issued_size_bytes: issuedFile?.size_bytes ?? null,
  });

  if (error) throw error;
}

export type CouncilorProfile = WardCouncilorRow | null;

export type CouncilorReviewAction = 'verified' | 'rejected' | 'need_correction';

export type CouncilorReviewInput = {
  applicationId: string;
  action: CouncilorReviewAction;
  councilorRemarks: string;
  publicRemarks?: string;
};

export async function fetchCurrentWardCouncilor(): Promise<CouncilorProfile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;

  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('ward_councilors')
    .select('id, user_id, full_name, ward, mobile, designation, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as CouncilorProfile;
}

export async function fetchCouncilorCertificateApplications(): Promise<CertificateApplicationRow[]> {
  const { data, error } = await supabase
    .from('certificate_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CertificateApplicationRow[];
}

export async function councilorReviewCertificateApplication(input: CouncilorReviewInput) {
  const remarks = input.councilorRemarks.trim();
  if (!remarks) {
    throw new Error('Councilor remarks are required for verification responsibility record.');
  }

  const { error } = await supabase.rpc('councilor_review_certificate_application_v1', {
    p_application_id: input.applicationId,
    p_action: input.action,
    p_councilor_remarks: remarks,
    p_public_remarks: emptyToNull(input.publicRemarks),
  });

  if (error) throw error;
}
