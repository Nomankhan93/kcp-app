import { supabase } from './supabase';
import type { CitizenCertificateSummaryRow, CitizenComplaintSummaryRow, CitizenProfileRow } from './types';

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

export type CitizenClaimType = 'complaint' | 'certificate';

export type CitizenClaimResult = {
  claimed: boolean;
  message: string;
};

function asText(value: unknown) {
  return typeof value === 'string' ? value : null;
}

export async function getCitizenAuthState(): Promise<CitizenAuthState> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { signedIn: false, userId: null, email: null };
  }

  return { signedIn: true, userId: data.user.id, email: data.user.email ?? null };
}

export async function signUpCitizen(email: string, password: string, fullName: string) {
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
    await saveCitizenProfile({ fullName, mobile: '' });
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
    .from('citizen_profiles')
    .select('user_id, full_name, mobile, cnic, address, area, ward, mohalla, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as CitizenProfileRow | null;
}

export async function saveCitizenProfile(input: CitizenProfileInput): Promise<CitizenProfileRow> {
  const { data, error } = await supabase.rpc('upsert_citizen_profile_v1', {
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

export async function fetchMyCitizenComplaints(): Promise<CitizenComplaintSummaryRow[]> {
  const { data, error } = await supabase.rpc('get_my_citizen_complaints_v1');
  if (error) throw error;
  return (data ?? []) as CitizenComplaintSummaryRow[];
}

export async function fetchMyCitizenCertificates(): Promise<CitizenCertificateSummaryRow[]> {
  const { data, error } = await supabase.rpc('get_my_citizen_certificates_v1');
  if (error) throw error;
  return (data ?? []) as CitizenCertificateSummaryRow[];
}

export async function claimCitizenRecord(type: CitizenClaimType, trackingNo: string, mobile: string): Promise<CitizenClaimResult> {
  const { data, error } = await supabase.rpc('claim_citizen_record_v1', {
    p_record_type: type,
    p_tracking_no: trackingNo.trim(),
    p_mobile: mobile.trim(),
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    claimed: Boolean(row?.claimed),
    message: asText(row?.message) ?? 'Record claim request completed.',
  };
}

export function formatCitizenStatus(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
