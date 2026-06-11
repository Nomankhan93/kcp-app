import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, ExternalLink, Loader2, LogOut, RefreshCw, Save } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { AlertBox, ConfirmDialog, EmptyState, InlineToast, LoadingPanel, PermissionDeniedState } from '../components/ui/Feedback';
import {
  checkAdminAccess,
  createPhotoSignedUrl,
  fetchAdminComplaint,
  fetchComplaintAttachments,
  fetchComplaintHistory,
  fetchStaffMembers,
  updateAdminComplaint,
  uploadResolutionProof,
} from '../lib/adminComplaints';
import { categoryLabels, departmentOptions, statusLabels } from '../lib/constants';
import { supabase } from '../lib/supabase';
import type {
  AdminComplaint,
  AdminComplaintAttachment,
  AdminComplaintStatusHistory,
  ComplaintPriority,
  ComplaintStatus,
  StaffMember,
} from '../lib/types';

const statusOptions = Object.entries(statusLabels) as Array<[ComplaintStatus, string]>;
const priorityOptions: Array<[ComplaintPriority, string]> = [
  ['low', 'Low'],
  ['normal', 'Normal'],
  ['high', 'High'],
  ['urgent', 'Urgent'],
];

type SessionState = 'checking' | 'signed-out' | 'signed-in';

type AccessState = {
  allowed: boolean | null;
  role: 'admin' | 'chairman' | 'staff' | null;
};

type SignedUrlMap = Record<string, string | null>;

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function AdminComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [access, setAccess] = useState<AccessState>({ allowed: null, role: null });
  const [complaint, setComplaint] = useState<AdminComplaint | null>(null);
  const [draft, setDraft] = useState<AdminComplaint | null>(null);
  const [history, setHistory] = useState<AdminComplaintStatusHistory[]>([]);
  const [attachments, setAttachments] = useState<AdminComplaintAttachment[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [signedUrls, setSignedUrls] = useState<SignedUrlMap>({});
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmResolvedOpen, setConfirmResolvedOpen] = useState(false);

  const selectedStaff = useMemo(() => {
    if (!draft?.assigned_staff_id) return null;
    return staffMembers.find((staff) => staff.id === draft.assigned_staff_id) ?? null;
  }, [draft?.assigned_staff_id, staffMembers]);

  useEffect(() => {
    async function init() {
      const accessCheck = await checkAdminAccess();

      if (!accessCheck.signedIn) {
        setSessionState('signed-out');
        setLoading(false);
        return;
      }

      setSessionState('signed-in');
      setAccess({ allowed: accessCheck.allowed, role: accessCheck.role });

      if (accessCheck.allowed && id) {
        await loadDetail(id);
      } else {
        setLoading(false);
      }
    }

    void init();
  }, [id]);

  async function loadDetail(complaintId = id) {
    if (!complaintId) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const [complaintRow, staffRows] = await Promise.all([fetchAdminComplaint(complaintId), fetchStaffMembers()]);

      if (!complaintRow) {
        setComplaint(null);
        setDraft(null);
        setHistory([]);
        setAttachments([]);
        setStaffMembers(staffRows);
        setError('Complaint not found or you do not have access to it.');
        return;
      }

      const [historyRows, attachmentRows] = await Promise.all([
        fetchComplaintHistory(complaintRow.id),
        fetchComplaintAttachments(complaintRow.id),
      ]);

      const urlEntries = await Promise.all(
        Array.from(
          new Set(
            [complaintRow.photo_path, complaintRow.resolution_photo_path, ...attachmentRows.map((item) => item.storage_path)].filter(Boolean) as string[],
          ),
        ).map(async (path) => [path, await createPhotoSignedUrl(path)] as const),
      );

      setComplaint(complaintRow);
      setDraft(complaintRow);
      setStaffMembers(staffRows);
      setHistory(historyRows);
      setAttachments(attachmentRows);
      setSignedUrls(Object.fromEntries(urlEntries));
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : 'Unable to load complaint details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  function handleStaffChange(event: ChangeEvent<HTMLSelectElement>) {
    if (!draft) return;

    const staffId = event.target.value || null;
    const staff = staffMembers.find((item) => item.id === staffId) ?? null;

    setDraft({
      ...draft,
      assigned_staff_id: staffId,
      assigned_to: staff ? staff.full_name : draft.assigned_to,
      assigned_department: staff?.department ?? draft.assigned_department,
    });
  }

  function requestSave() {
    if (!draft) return;

    if (complaint?.status !== 'resolved' && draft.status === 'resolved') {
      setConfirmResolvedOpen(true);
      return;
    }

    void handleSave();
  }

  async function handleSave() {
    if (!draft) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let resolutionProof = null;
      let resolutionPhotoPath = draft.resolution_photo_path;

      if (resolutionFile) {
        resolutionProof = await uploadResolutionProof(draft.id, resolutionFile);
        resolutionPhotoPath = resolutionProof.path;
      }

      await updateAdminComplaint(
        {
          id: draft.id,
          status: draft.status,
          priority: draft.priority,
          assignedDepartment: emptyToNull(draft.assigned_department ?? ''),
          assignedTo: emptyToNull(draft.assigned_to ?? ''),
          assignedStaffId: draft.assigned_staff_id,
          publicRemarks: emptyToNull(draft.public_remarks ?? ''),
          internalRemarks: emptyToNull(draft.internal_remarks ?? ''),
          resolutionPhotoPath,
        },
        resolutionProof,
      );

      setResolutionFile(null);
      setSuccess('Complaint updated successfully. Citizen tracking timeline has also been updated when status/remarks changed.');
      await loadDetail(draft.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save complaint changes.');
    } finally {
      setSaving(false);
    }
  }

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="Admin Dashboard"
        title={complaint ? complaint.tracking_no : 'Complaint detail'}
        description="View citizen complaint details, assign staff, update status, add remarks and upload resolution proof."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadDetail()}
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </button>
          </div>
        </div>

        {loading && sessionState === 'checking' ? <LoadingPanel message="Checking admin access..." /> : null}

        {access.allowed === false ? (
          <PermissionDeniedState
            title="Access denied"
            description="Your account is signed in but not assigned as admin, chairman or staff in user_roles table."
            action={(
              <button type="button" onClick={handleLogout} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800">
                Logout
              </button>
            )}
          />
        ) : null}

        {access.allowed ? (
          <>
            {error ? <div className="mb-4"><InlineToast tone="error" message={error} onDismiss={() => setError('')} /></div> : null}
            {success ? <div className="mb-4"><InlineToast tone="success" message={success} onDismiss={() => setSuccess('')} /></div> : null}

            {loading ? <LoadingPanel message="Loading complaint details..." /> : null}

            {!loading && !draft ? (
              <EmptyState
                title="Complaint not found"
                description="This complaint could not be loaded, or your account does not have access to it."
                action={(
                  <button type="button" onClick={() => navigate('/admin')} className="rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800">
                    Go back to dashboard
                  </button>
                )}
              />
            ) : null}

            {!loading && draft ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-mono text-sm font-black text-civic-800">{draft.tracking_no}</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-950">{draft.full_name}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Submitted {new Date(draft.created_at).toLocaleString()} · Updated {new Date(draft.updated_at).toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge status={draft.status} />
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <ReadOnly label="Mobile" value={draft.mobile} />
                      <ReadOnly label="CNIC" value={draft.cnic || 'Not provided'} />
                      <ReadOnly label="Category" value={categoryLabels[draft.category] ?? draft.category} />
                      <ReadOnly label="Area / Ward" value={`${draft.area}${draft.ward ? ` · ${draft.ward}` : ''}${draft.mohalla ? ` · ${draft.mohalla}` : ''}`} />
                      <ReadOnly label="Assigned Department" value={draft.assigned_department || 'Not assigned'} />
                      <ReadOnly label="Assigned Staff" value={draft.assigned_to || 'Not assigned'} />
                    </div>

                    <div className="mt-4">
                      <ReadOnly label="Complaint Details" value={draft.details} />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black text-slate-950">Photo proof</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <PhotoCard
                        title="Citizen submitted photo"
                        path={draft.photo_path}
                        signedUrl={draft.photo_path ? signedUrls[draft.photo_path] : null}
                      />
                      <PhotoCard
                        title="Resolution proof photo"
                        path={draft.resolution_photo_path}
                        signedUrl={draft.resolution_photo_path ? signedUrls[draft.resolution_photo_path] : null}
                      />
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black text-slate-950">Status timeline</h3>
                    <div className="mt-4 space-y-3">
                      {history.length === 0 ? <EmptyState title="No timeline history yet" description="Status changes and officer remarks will appear here after the first update." /> : null}
                      {history.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <StatusBadge status={item.status} />
                            <p className="text-xs font-medium text-slate-500">{new Date(item.changed_at).toLocaleString()}</p>
                          </div>
                          {item.public_remarks ? <p className="mt-3 text-sm text-slate-700">Public: {item.public_remarks}</p> : null}
                          {item.internal_remarks ? <p className="mt-2 text-xs text-slate-500">Internal: {item.internal_remarks}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black text-slate-950">Attachments log</h3>
                    <div className="mt-4 space-y-3">
                      {attachments.length === 0 ? <EmptyState title="No attachments recorded" description="Citizen and resolution attachments will appear here when uploaded." /> : null}
                      {attachments.map((item) => {
                        const signedUrl = signedUrls[item.storage_path];
                        return (
                          <div key={item.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-bold capitalize text-slate-900">{item.kind} photo</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {item.file_name || item.storage_path} · {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            {signedUrl ? (
                              <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700">
                                Open <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                              </a>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
                  <h3 className="text-lg font-black text-slate-950">Update complaint</h3>
                  <p className="mt-1 text-sm text-slate-500">Public remarks will be visible to citizens on the tracking page.</p>

                  <div className="mt-5 grid gap-4">
                    <SelectField label="Status" value={draft.status} onChange={(value) => setDraft({ ...draft, status: value as ComplaintStatus })} options={statusOptions} />
                    <SelectField label="Priority" value={draft.priority} onChange={(value) => setDraft({ ...draft, priority: value as ComplaintPriority })} options={priorityOptions} />

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Assigned Department</span>
                      <select
                        value={draft.assigned_department ?? ''}
                        onChange={(event) => setDraft({ ...draft, assigned_department: event.target.value || null })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                      >
                        <option value="">Not assigned</option>
                        {departmentOptions.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Assign Staff</span>
                      <select
                        value={draft.assigned_staff_id ?? ''}
                        onChange={handleStaffChange}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                      >
                        <option value="">Not assigned</option>
                        {staffMembers.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name} {staff.department ? `— ${staff.department}` : ''}
                          </option>
                        ))}
                      </select>
                      {selectedStaff ? (
                        <p className="mt-2 text-xs text-slate-500">
                          {selectedStaff.designation || 'Staff'} {selectedStaff.mobile ? `· ${selectedStaff.mobile}` : ''}
                        </p>
                      ) : null}
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Assigned To / Officer Name</span>
                      <input
                        value={draft.assigned_to ?? ''}
                        onChange={(event) => setDraft({ ...draft, assigned_to: event.target.value || null })}
                        placeholder="Officer / staff name"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Public Remarks</span>
                      <textarea
                        value={draft.public_remarks ?? ''}
                        onChange={(event) => setDraft({ ...draft, public_remarks: event.target.value || null })}
                        rows={3}
                        placeholder="Example: Complaint received and assigned to sanitation staff."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-slate-700">Internal Remarks</span>
                      <textarea
                        value={draft.internal_remarks ?? ''}
                        onChange={(event) => setDraft({ ...draft, internal_remarks: event.target.value || null })}
                        rows={3}
                        placeholder="Internal office note, not visible to citizen."
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
                      />
                    </label>

                    <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                      <span className="inline-flex items-center text-sm font-semibold text-slate-700">
                        <Camera className="mr-2 h-4 w-4" /> Resolution Photo Proof
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => setResolutionFile(event.target.files?.[0] ?? null)}
                        className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-civic-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white"
                      />
                      <p className="mt-2 text-xs text-slate-500">Optional. Upload after/resolution proof photo. Max 5MB.</p>
                      {resolutionFile ? <p className="mt-2 text-xs font-bold text-civic-800">Selected: {resolutionFile.name}</p> : null}
                    </label>
                  </div>

                  <button
                    onClick={requestSave}
                    disabled={saving}
                    className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </button>
                </aside>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
      <ConfirmDialog
        open={confirmResolvedOpen}
        title="Mark complaint as resolved?"
        description={(
          <span>
            This will mark complaint <strong>{draft?.tracking_no}</strong> as resolved and the public tracking timeline will show the latest public remarks. Please confirm that resolution proof and public remarks are correct.
          </span>
        )}
        confirmLabel="Mark Resolved"
        tone="success"
        busy={saving}
        onCancel={() => setConfirmResolvedOpen(false)}
        onConfirm={() => {
          setConfirmResolvedOpen(false);
          void handleSave();
        }}
      />

    </>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function PhotoCard({ title, path, signedUrl }: { title: string; path: string | null; signedUrl: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        {signedUrl ? (
          <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-bold text-civic-800 hover:underline">
            Open <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        ) : null}
      </div>

      {signedUrl ? (
        <img src={signedUrl} alt={title} className="mt-3 h-56 w-full rounded-xl object-cover ring-1 ring-slate-200" />
      ) : (
        <div className="mt-3 flex h-56 items-center justify-center rounded-xl bg-white text-sm text-slate-500 ring-1 ring-slate-200">
          {path ? 'Photo exists but could not be previewed.' : 'No photo uploaded.'}
        </div>
      )}

      {path ? <p className="mt-2 break-all font-mono text-[11px] text-slate-400">{path}</p> : null}
    </div>
  );
}
