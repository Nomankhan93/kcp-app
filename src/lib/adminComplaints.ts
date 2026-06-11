import { supabase } from './supabase';
import { validateComplaintPhoto } from './complaints';
import type {
  AdminComplaint,
  AdminComplaintAttachment,
  AdminComplaintStatusHistory,
  ComplaintPriority,
  ComplaintStatus,
  StaffMember,
} from './types';

export type AdminSessionCheck = {
  signedIn: boolean;
  allowed: boolean;
  role: 'admin' | 'chairman' | 'staff' | null;
};

export type AdminComplaintUpdateInput = {
  id: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assignedDepartment: string | null;
  assignedTo: string | null;
  assignedStaffId: string | null;
  publicRemarks: string | null;
  internalRemarks: string | null;
  resolutionPhotoPath: string | null;
};

export type UploadedResolutionProof = {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export async function checkAdminAccess(): Promise<AdminSessionCheck> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return { signedIn: false, allowed: false, role: null };
  }

  const { data: roleData } = await supabase.rpc('current_portal_role');
  const role = asText(roleData) as AdminSessionCheck['role'];

  if (role === 'admin' || role === 'chairman' || role === 'staff') {
    return { signedIn: true, allowed: true, role };
  }

  // Backward compatible fallback for local DBs where admin-dashboard-v2.sql has not been run yet.
  const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin');
  if (!adminError && isAdminData) {
    return { signedIn: true, allowed: true, role: 'admin' };
  }

  return { signedIn: true, allowed: false, role: null };
}

export async function fetchAdminComplaints(): Promise<AdminComplaint[]> {
  const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminComplaint[];
}

export async function fetchAdminComplaint(id: string): Promise<AdminComplaint | null> {
  const { data, error } = await supabase.from('complaints').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return (data ?? null) as AdminComplaint | null;
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff_members')
    .select('id, full_name, designation, department, mobile, is_active')
    .eq('is_active', true)
    .order('department', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) {
    console.warn('Unable to load staff_members.', error.message);
    return [];
  }

  return (data ?? []) as StaffMember[];
}

export async function fetchComplaintHistory(complaintId: string): Promise<AdminComplaintStatusHistory[]> {
  const { data, error } = await supabase
    .from('complaint_status_history')
    .select('id, complaint_id, status, public_remarks, internal_remarks, changed_by, changed_at')
    .eq('complaint_id', complaintId)
    .order('changed_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminComplaintStatusHistory[];
}

export async function fetchComplaintAttachments(complaintId: string): Promise<AdminComplaintAttachment[]> {
  const { data, error } = await supabase
    .from('complaint_attachments')
    .select('id, complaint_id, kind, storage_path, file_name, mime_type, size_bytes, uploaded_by, created_at')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AdminComplaintAttachment[];
}

export async function createPhotoSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage.from('complaint-photos').createSignedUrl(path, 60 * 10);

  if (error) {
    console.warn('Unable to create signed URL for complaint photo.', error.message);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function uploadResolutionProof(complaintId: string, file: File): Promise<UploadedResolutionProof> {
  validateComplaintPhoto(file);

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';
  const path = `admin-resolution/${new Date().getFullYear()}/${complaintId}-${crypto.randomUUID()}.${safeExtension}`;

  const { error } = await supabase.storage.from('complaint-photos').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  return {
    path,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

export async function updateAdminComplaint(input: AdminComplaintUpdateInput, resolutionProof?: UploadedResolutionProof | null) {
  const { error: rpcError } = await supabase.rpc('admin_update_complaint_v2', {
    p_complaint_id: input.id,
    p_status: input.status,
    p_priority: input.priority,
    p_assigned_department: input.assignedDepartment,
    p_assigned_to: input.assignedTo,
    p_assigned_staff_id: input.assignedStaffId,
    p_public_remarks: input.publicRemarks,
    p_internal_remarks: input.internalRemarks,
    p_resolution_photo_path: input.resolutionPhotoPath,
  });

  if (rpcError) {
    // Fail closed: admin/staff mutations must go through the audited RPC path.
    // Do not fall back to direct table updates because that can bypass workflow
    // guards, status history logic, and future role restrictions.
    throw rpcError;
  }

  if (resolutionProof) {
    const { error: attachmentError } = await supabase.from('complaint_attachments').insert({
      complaint_id: input.id,
      kind: 'resolution',
      storage_path: resolutionProof.path,
      file_name: resolutionProof.fileName,
      mime_type: resolutionProof.mimeType,
      size_bytes: resolutionProof.sizeBytes,
    });

    // Do not fail the whole admin update if only the optional attachment log failed.
    if (attachmentError) console.warn('Resolution proof was uploaded but attachment log failed.', attachmentError.message);
  }
}
