import type { ComplaintCategory, ComplaintCategoryRow, ComplaintStatus } from './types';

export const categoryLabels: Record<ComplaintCategory, string> = {
  sanitation: 'Sanitation / Cleanliness',
  street_lights: 'Street Lights',
  drainage: 'Drainage / Sewerage',
  water_supply: 'Water Supply',
  roads: 'Roads / Streets',
  encroachment: 'Encroachment',
  parks: 'Parks / Public Spaces',
  birth_death_record: 'Birth / Death Record Inquiry',
  other: 'Other Municipal Service',
};

export const defaultComplaintCategories: ComplaintCategoryRow[] = [
  { id: 'sanitation', slug: 'sanitation', name: categoryLabels.sanitation, department: 'Sanitation', sort_order: 10, is_active: true },
  { id: 'street_lights', slug: 'street_lights', name: categoryLabels.street_lights, department: 'Street Lights', sort_order: 20, is_active: true },
  { id: 'drainage', slug: 'drainage', name: categoryLabels.drainage, department: 'Drainage', sort_order: 30, is_active: true },
  { id: 'water_supply', slug: 'water_supply', name: categoryLabels.water_supply, department: 'Water Supply', sort_order: 40, is_active: true },
  { id: 'roads', slug: 'roads', name: categoryLabels.roads, department: 'Roads & Works', sort_order: 50, is_active: true },
  { id: 'encroachment', slug: 'encroachment', name: categoryLabels.encroachment, department: 'Administration', sort_order: 60, is_active: true },
  { id: 'birth_death_record', slug: 'birth_death_record', name: categoryLabels.birth_death_record, department: 'Record Branch', sort_order: 70, is_active: true },
  { id: 'other', slug: 'other', name: categoryLabels.other, department: 'Administration', sort_order: 90, is_active: true },
];

export const defaultCitizenAreas = [
  { id: 'ward-01', name: 'Ward 01', ward: 'Ward 01', sort_order: 10, is_active: true },
  { id: 'ward-02', name: 'Ward 02', ward: 'Ward 02', sort_order: 20, is_active: true },
  { id: 'ward-03', name: 'Ward 03', ward: 'Ward 03', sort_order: 30, is_active: true },
  { id: 'ward-04', name: 'Ward 04', ward: 'Ward 04', sort_order: 40, is_active: true },
  { id: 'ward-05', name: 'Ward 05', ward: 'Ward 05', sort_order: 50, is_active: true },
  { id: 'ward-06', name: 'Ward 06', ward: 'Ward 06', sort_order: 60, is_active: true },
  { id: 'ward-07', name: 'Ward 07', ward: 'Ward 07', sort_order: 70, is_active: true },
  { id: 'ward-08', name: 'Ward 08', ward: 'Ward 08', sort_order: 80, is_active: true },
  { id: 'ward-09', name: 'Ward 09', ward: 'Ward 09', sort_order: 90, is_active: true },
  { id: 'ward-10', name: 'Ward 10', ward: 'Ward 10', sort_order: 100, is_active: true },
  { id: 'main-bazaar', name: 'Main Bazaar', ward: null, sort_order: 140, is_active: true },
  { id: 'other-area', name: 'Other / Not Listed', ward: null, sort_order: 999, is_active: true },
];

export const statusLabels: Record<ComplaintStatus, string> = {
  submitted: 'Submitted',
  received: 'Received',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  not_related: 'Not Related',
};

export const statusBadgeClasses: Record<ComplaintStatus, string> = {
  submitted: 'bg-slate-100 text-slate-700 ring-slate-200',
  received: 'bg-blue-50 text-blue-700 ring-blue-100',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-100',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
  not_related: 'bg-orange-50 text-orange-700 ring-orange-100',
};

export const departmentOptions = [
  'Sanitation',
  'Street Lights',
  'Drainage',
  'Water Supply',
  'Roads & Works',
  'Record Branch',
  'Administration',
];

export const certificateTypeLabels = {
  birth: 'Birth Certificate',
  marriage: 'Marriage Certificate',
  death: 'Death Certificate',
} as const;

export const certificateStatusLabels = {
  submitted: 'Submitted',
  councilor_review: 'Councilor Review',
  councilor_verified: 'Councilor Verified',
  councilor_rejected: 'Councilor Rejected',
  town_review: 'Under Office Processing',
  need_more_info: 'Need Correction / More Info',
  certificate_uploaded: 'Certificate Uploaded',
  ready_for_collection: 'Ready for Collection',
  delivered: 'Delivered',
  rejected: 'Rejected',
} as const;

export const certificateStatusBadgeClasses = {
  submitted: 'bg-slate-100 text-slate-700 ring-slate-200',
  councilor_review: 'bg-blue-50 text-blue-700 ring-blue-100',
  councilor_verified: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  councilor_rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
  town_review: 'bg-amber-50 text-amber-700 ring-amber-100',
  need_more_info: 'bg-orange-50 text-orange-700 ring-orange-100',
  certificate_uploaded: 'bg-purple-50 text-purple-700 ring-purple-100',
  ready_for_collection: 'bg-civic-50 text-civic-800 ring-civic-100',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
} as const;

export const certificateDocumentLabels = {
  applicant_cnic: 'Applicant CNIC',
  parent_cnic: 'Parent CNIC',
  hospital_birth_proof: 'Hospital / Birth Proof',
  nikah_nama: 'Nikah Nama',
  bride_groom_cnic: 'Bride / Groom CNIC',
  witness_cnic: 'Witness CNIC',
  deceased_cnic: 'Deceased CNIC',
  death_proof: 'Death Proof',
  graveyard_slip: 'Graveyard / Burial Slip',
  affidavit: 'Affidavit / Undertaking',
  other: 'Other Supporting Document',
  issued_certificate: 'Issued Certificate',
} as const;
