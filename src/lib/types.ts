export type ComplaintCategory =
  | 'sanitation'
  | 'street_lights'
  | 'drainage'
  | 'water_supply'
  | 'roads'
  | 'encroachment'
  | 'parks'
  | 'birth_death_record'
  | 'other';

export type ComplaintStatus =
  | 'submitted'
  | 'received'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'not_related';

export type ComplaintPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ComplaintCategoryRow = {
  id: string;
  slug: ComplaintCategory;
  name: string;
  department: string | null;
  sort_order: number;
  is_active: boolean;
};

export type CitizenAreaRow = {
  id: string;
  name: string;
  ward: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ComplaintTimelineItem = {
  status: ComplaintStatus;
  public_remarks: string | null;
  changed_at: string;
};

export type PublicComplaint = {
  tracking_no: string;
  category: ComplaintCategory;
  category_name: string | null;
  area: string;
  ward: string | null;
  mohalla: string | null;
  status: ComplaintStatus;
  assigned_department: string | null;
  created_at: string;
  updated_at: string;
  public_remarks: string | null;
};

export type PublicComplaintResult = {
  complaint: PublicComplaint | null;
  timeline: ComplaintTimelineItem[];
};

export type StaffMember = {
  id: string;
  full_name: string;
  designation: string | null;
  department: string | null;
  mobile: string | null;
  is_active: boolean;
};

export type AdminComplaint = {
  id: string;
  tracking_no: string;
  full_name: string;
  mobile: string;
  cnic: string | null;
  area: string;
  ward: string | null;
  mohalla: string | null;
  category: ComplaintCategory;
  category_id: string | null;
  area_id: string | null;
  details: string;
  photo_path: string | null;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  assigned_department: string | null;
  assigned_to: string | null;
  assigned_staff_id: string | null;
  resolution_photo_path: string | null;
  internal_remarks: string | null;
  public_remarks: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};


export type AdminComplaintAttachment = {
  id: string;
  complaint_id: string;
  kind: 'submission' | 'resolution';
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type AdminComplaintStatusHistory = {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  public_remarks: string | null;
  internal_remarks: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type CertificateType = 'birth' | 'marriage' | 'death';

export type CertificateApplicationStatus =
  | 'submitted'
  | 'councilor_review'
  | 'councilor_verified'
  | 'councilor_rejected'
  | 'town_review'
  | 'need_more_info'
  | 'certificate_uploaded'
  | 'ready_for_collection'
  | 'delivered'
  | 'rejected';

export type CertificateDocumentKind =
  | 'applicant_cnic'
  | 'parent_cnic'
  | 'hospital_birth_proof'
  | 'nikah_nama'
  | 'bride_groom_cnic'
  | 'witness_cnic'
  | 'deceased_cnic'
  | 'death_proof'
  | 'graveyard_slip'
  | 'affidavit'
  | 'other'
  | 'issued_certificate';

export type CertificateApplicationRow = {
  id: string;
  tracking_no: string;
  certificate_type: CertificateType;
  status: CertificateApplicationStatus;
  applicant_name: string;
  applicant_mobile: string;
  applicant_cnic: string | null;
  applicant_relation: string | null;
  applicant_address: string;
  area: string;
  ward: string;
  mohalla: string | null;
  assigned_councilor_id: string | null;
  councilor_status: 'pending' | 'verified' | 'rejected';
  councilor_remarks: string | null;
  councilor_verified_by: string | null;
  councilor_verified_at: string | null;
  subject_name: string;
  subject_cnic: string | null;
  event_date: string;
  event_place: string;
  form_data: Record<string, unknown> | null;
  town_remarks: string | null;
  public_remarks: string | null;
  certificate_number: string | null;
  issued_certificate_path: string | null;
  issued_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CertificateDocumentRow = {
  id: string;
  application_id: string;
  kind: CertificateDocumentKind;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type CertificateStatusHistoryRow = {
  id: string;
  application_id: string;
  status: CertificateApplicationStatus;
  public_remarks: string | null;
  internal_remarks: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type WardCouncilorRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  ward: string;
  mobile: string | null;
  designation: string | null;
  is_active: boolean;
};

export type PublicCertificateApplication = {
  tracking_no: string;
  certificate_type: CertificateType;
  status: CertificateApplicationStatus;
  applicant_name: string;
  area: string;
  ward: string;
  mohalla: string | null;
  councilor_status: 'pending' | 'verified' | 'rejected';
  subject_name: string;
  event_date: string;
  event_place: string;
  public_remarks: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};
