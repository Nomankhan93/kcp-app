import { supabase } from './supabase';
import type { PortalAuthUserRow, PortalRole, PortalUserRoleRow, WardCouncilorManagementRow } from './types';

export type UserManagementAccess = {
  signedIn: boolean;
  allowed: boolean;
  role: PortalRole | null;
};

export type WardCouncilorAssignmentInput = {
  ward: string;
  userId: string | null;
  fullName: string;
  mobile: string | null;
  designation: string | null;
  isActive: boolean;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export const manageablePortalRoles: Array<{ value: PortalRole; label: string; description: string }> = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full portal administration including complaints, certificates, CMS, users and settings.',
  },
  {
    value: 'chairman',
    label: 'Chairman',
    description: 'Monitoring, dashboards, reports and user oversight access.',
  },
  {
    value: 'staff',
    label: 'Town Committee Staff',
    description: 'Complaint handling, CMS updates and certificate office workflow access.',
  },
  {
    value: 'certificate_officer',
    label: 'Certificate Officer',
    description: 'Certificate applications, final processing, certificate upload and delivery workflow.',
  },
  {
    value: 'general_councilor',
    label: 'General Councilor',
    description: 'Limited ward-based certificate verification access only.',
  },
];

export async function checkUserManagementAccess(): Promise<UserManagementAccess> {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return { signedIn: false, allowed: false, role: null };
  }

  const { data, error } = await supabase.rpc('current_portal_role');
  const role = asText(data) as PortalRole | null;

  if (!error && (role === 'admin' || role === 'chairman')) {
    return { signedIn: true, allowed: true, role };
  }

  return { signedIn: true, allowed: false, role };
}

export async function fetchPortalUsersWithRoles(): Promise<PortalAuthUserRow[]> {
  const { data, error } = await supabase.rpc('list_portal_users_with_roles_v1');

  if (error) throw error;
  return (data ?? []) as PortalAuthUserRow[];
}

export async function fetchPortalRoles(): Promise<PortalUserRoleRow[]> {
  const { data, error } = await supabase.rpc('list_portal_roles_v1');

  if (error) throw error;
  return (data ?? []) as PortalUserRoleRow[];
}

export async function setPortalUserRole(userId: string, role: PortalRole, enabled: boolean) {
  const { error } = await supabase.rpc('set_portal_user_role_v1', {
    p_user_id: userId,
    p_role: role,
    p_enabled: enabled,
  });

  if (error) throw error;
}

export async function fetchWardCouncilorManagementRows(): Promise<WardCouncilorManagementRow[]> {
  const { data, error } = await supabase.rpc('list_ward_councilors_management_v1');

  if (error) throw error;
  return (data ?? []) as WardCouncilorManagementRow[];
}

export async function saveWardCouncilorAssignment(input: WardCouncilorAssignmentInput) {
  const { error } = await supabase.rpc('upsert_ward_councilor_assignment_v1', {
    p_ward: input.ward,
    p_user_id: input.userId,
    p_full_name: input.fullName.trim(),
    p_mobile: input.mobile?.trim() || null,
    p_designation: input.designation?.trim() || 'General Councilor',
    p_is_active: input.isActive,
  });

  if (error) throw error;
}
