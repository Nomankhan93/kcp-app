
export type PortalRole = 'admin' | 'chairman' | 'staff' | 'certificate_officer' | 'general_councilor';

export type PortalAuthUserRow = {
  user_id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  roles: PortalRole[] | null;
};

export type PortalUserRoleRow = {
  user_id: string;
  email: string | null;
  role: PortalRole;
  created_at: string;
};

export type WardCouncilorManagementRow = {
  id: string | null;
  ward: string;
  full_name: string | null;
  user_id: string | null;
  email: string | null;
  mobile: string | null;
  designation: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

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
  issued_certificate_path: string | null;
  issued_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CmsStatus = 'draft' | 'published';

export type CmsNoticeRow = {
  id: string;
  title: string;
  description: string;
  notice_date: string;
  attachment_path: string | null;
  attachment_url: string | null;
  status: CmsStatus;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type CmsNewsRow = {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  image_path: string | null;
  image_url: string | null;
  published_at: string;
  status: CmsStatus;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type CmsDownloadRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  file_path: string | null;
  file_url: string | null;
  file_name: string | null;
  status: CmsStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CmsLeadershipMessageRow = {
  id: string;
  message_key: string;
  eyebrow: string;
  title: string;
  full_name: string;
  designation: string;
  subtitle: string;
  message_text: string;
  note: string | null;
  image_path: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_fit: 'cover' | 'contain';
  display_order: number;
  status: CmsStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CitizenProfileRow = {
  user_id: string;
  full_name: string | null;
  mobile: string | null;
  cnic: string | null;
  address: string | null;
  area: string | null;
  ward: string | null;
  mohalla: string | null;
  created_at: string;
  updated_at: string;
};

export type CitizenComplaintSummaryRow = {
  id: string;
  tracking_no: string;
  category: string;
  area: string;
  ward: string | null;
  status: string;
  public_remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type CitizenCertificateSummaryRow = {
  id: string;
  tracking_no: string;
  certificate_type: string;
  subject_name: string;
  ward: string;
  status: string;
  public_remarks: string | null;
  certificate_number: string | null;
  issued_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CitizenNotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  related_type: 'complaint' | 'certificate' | 'profile' | 'system' | null;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
};

export type CitizenComplaintDetailRow = CitizenComplaintSummaryRow & {
  full_name: string;
  mobile: string;
  cnic: string | null;
  mohalla: string | null;
  details: string;
  assigned_department: string | null;
  resolved_at: string | null;
};

export type CitizenComplaintTimelineRow = {
  id: string;
  complaint_id: string;
  status: string;
  public_remarks: string | null;
  changed_at: string;
};

export type CitizenCertificateDetailRow = CitizenCertificateSummaryRow & {
  applicant_name: string;
  applicant_mobile: string;
  applicant_cnic: string | null;
  applicant_relation: string | null;
  applicant_address: string;
  area: string;
  mohalla: string | null;
  councilor_status: 'pending' | 'verified' | 'rejected';
  councilor_remarks: string | null;
  subject_cnic: string | null;
  event_date: string;
  event_place: string;
  form_data: Record<string, unknown> | null;
  town_remarks: string | null;
  issued_certificate_path: string | null;
};

export type CitizenCertificateDocumentRow = CertificateDocumentRow & {
  signed_url?: string | null;
};
