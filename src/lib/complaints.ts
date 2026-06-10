import { defaultCitizenAreas, defaultComplaintCategories } from './constants';
import { supabase } from './supabase';
import type {
  CitizenAreaRow,
  ComplaintCategory,
  ComplaintCategoryRow,
  ComplaintTimelineItem,
  PublicComplaint,
  PublicComplaintResult,
} from './types';

export type SubmitComplaintInput = {
  fullName: string;
  mobile: string;
  cnic?: string;
  areaId?: string;
  areaText: string;
  ward?: string;
  mohalla?: string;
  categoryId?: string;
  category: ComplaintCategory;
  details: string;
  photoFile?: File | null;
};

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const allowedPhotoTypes = ['image/jpeg', 'image/png', 'image/webp'];

function normalizePhone(value: string) {
  return value.trim().replace(/\s+/g, '');
}

function normalizeTrackingNo(value: string) {
  return value.trim().toUpperCase();
}

function asUuidOrNull(value?: string) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function normalizeCnic(value?: string) {
  const clean = value?.trim() ?? '';
  return clean.length > 0 ? clean : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function validateComplaintPhoto(file: File) {
  if (!allowedPhotoTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG or WEBP photo proof is allowed.');
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('Photo proof must be 5MB or smaller.');
  }
}

export async function getComplaintCategories(): Promise<ComplaintCategoryRow[]> {
  const { data, error } = await supabase
    .from('complaint_categories')
    .select('id, slug, name, department, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Unable to load complaint_categories. Using defaults.', error.message);
    return defaultComplaintCategories;
  }

  return data?.length ? (data as ComplaintCategoryRow[]) : defaultComplaintCategories;
}

export async function getCitizenAreas(): Promise<CitizenAreaRow[]> {
  const { data, error } = await supabase
    .from('citizen_areas')
    .select('id, name, ward, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Unable to load citizen_areas. Using defaults.', error.message);
    return defaultCitizenAreas;
  }

  return data?.length ? (data as CitizenAreaRow[]) : defaultCitizenAreas;
}

async function uploadComplaintPhoto(file: File): Promise<string> {
  validateComplaintPhoto(file);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  const path = `public-submissions/${new Date().getFullYear()}/${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await supabase.storage.from('complaint-photos').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;
  return path;
}

export async function submitComplaint(input: SubmitComplaintInput): Promise<string> {
  let photoPath: string | null = null;

  if (input.photoFile) {
    photoPath = await uploadComplaintPhoto(input.photoFile);
  }

  const rpcPayload = {
    p_full_name: input.fullName.trim(),
    p_mobile: normalizePhone(input.mobile),
    p_cnic: normalizeCnic(input.cnic) ?? null,
    p_area_id: asUuidOrNull(input.areaId),
    p_area_text: input.areaText.trim(),
    p_ward: input.ward?.trim() || null,
    p_mohalla: input.mohalla?.trim() || null,
    p_category_id: asUuidOrNull(input.categoryId),
    p_category: input.category,
    p_details: input.details.trim(),
    p_photo_path: photoPath,
    p_photo_filename: input.photoFile?.name ?? null,
    p_photo_mime_type: input.photoFile?.type ?? null,
    p_photo_size_bytes: input.photoFile?.size ?? null,
  };

  const { data, error } = await supabase.rpc('submit_complaint_v2', rpcPayload);

  if (error) {
    // Fallback for old DBs where the v2 RPC has not been applied yet.
    const { data: legacyData, error: legacyError } = await supabase.rpc('submit_complaint', {
      p_full_name: rpcPayload.p_full_name,
      p_mobile: rpcPayload.p_mobile,
      p_cnic: rpcPayload.p_cnic,
      p_area: rpcPayload.p_area_text,
      p_ward: rpcPayload.p_ward,
      p_category: rpcPayload.p_category,
      p_details: rpcPayload.p_details,
      p_photo_path: rpcPayload.p_photo_path,
    });

    if (legacyError) throw new Error(getErrorMessage(error, getErrorMessage(legacyError, 'Unable to submit complaint.')));

    const legacyTrackingNo = Array.isArray(legacyData) ? legacyData[0]?.tracking_no : legacyData?.tracking_no;
    if (!legacyTrackingNo) throw new Error('Complaint submitted, but tracking number was not returned.');
    return legacyTrackingNo;
  }

  const trackingNo = Array.isArray(data) ? data[0]?.tracking_no : data?.tracking_no;
  if (!trackingNo) throw new Error('Complaint submitted, but tracking number was not returned.');

  return trackingNo;
}

export async function trackComplaint(trackingNo: string, mobile: string): Promise<PublicComplaintResult> {
  const normalizedTrackingNo = normalizeTrackingNo(trackingNo);
  const normalizedMobile = normalizePhone(mobile);

  const { data, error } = await supabase.rpc('get_complaint_public_v2', {
    p_tracking_no: normalizedTrackingNo,
    p_mobile: normalizedMobile,
  });

  if (error) {
    const { data: legacyData, error: legacyError } = await supabase.rpc('get_complaint_public', {
      p_tracking_no: normalizedTrackingNo,
      p_mobile: normalizedMobile,
    });

    if (legacyError) throw legacyError;
    const complaint = Array.isArray(legacyData) ? (legacyData[0] ?? null) : (legacyData ?? null);
    return { complaint: complaint as PublicComplaint | null, timeline: [] };
  }

  const complaint = Array.isArray(data) ? (data[0] ?? null) : (data ?? null);

  if (!complaint) {
    return { complaint: null, timeline: [] };
  }

  const { data: timelineData, error: timelineError } = await supabase.rpc('get_complaint_public_timeline', {
    p_tracking_no: normalizedTrackingNo,
    p_mobile: normalizedMobile,
  });

  return {
    complaint: complaint as PublicComplaint,
    timeline: timelineError ? [] : ((timelineData ?? []) as ComplaintTimelineItem[]),
  };
}
