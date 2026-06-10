import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileUp, Loader2, RefreshCw, Save } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import {
  checkCertificateAccess,
  createCertificateDocumentSignedUrl,
  fetchCertificateApplication,
  fetchCertificateDocuments,
  fetchCertificateHistory,
  fetchWardCouncilors,
  updateCertificateApplication,
  uploadIssuedCertificateFile,
  validateCertificateDocument,
} from '../lib/certificates';
import { certificateDocumentLabels, certificateStatusBadgeClasses, certificateStatusLabels, certificateTypeLabels } from '../lib/constants';
import type {
  CertificateApplicationRow,
  CertificateApplicationStatus,
  CertificateDocumentRow,
  CertificateStatusHistoryRow,
  WardCouncilorRow,
} from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';
type AccessRole = 'admin' | 'chairman' | 'staff' | 'general_councilor' | null;

const statusOptions = Object.entries(certificateStatusLabels) as Array<[CertificateApplicationStatus, string]>;

function getFormValue(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function AdminCertificateDetail() {
  const { id } = useParams();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [role, setRole] = useState<AccessRole>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [application, setApplication] = useState<CertificateApplicationRow | null>(null);
  const [documents, setDocuments] = useState<CertificateDocumentRow[]>([]);
  const [history, setHistory] = useState<CertificateStatusHistoryRow[]>([]);
  const [councilors, setCouncilors] = useState<WardCouncilorRow[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [issuedFile, setIssuedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canTownUpdate = role === 'admin' || role === 'chairman' || role === 'staff';
  const canCouncilorVerify = role === 'admin' || role === 'chairman' || role === 'general_councilor';

  const sameWardCouncilors = useMemo(() => {
    if (!application) return councilors;
    return councilors.filter((item) => item.ward === application.ward || item.ward.toLowerCase() === application.ward.toLowerCase());
  }, [application, councilors]);

  useEffect(() => {
    async function init() {
      const access = await checkCertificateAccess();

      if (!access.signedIn) {
        setSessionState('signed-out');
        setLoading(false);
        return;
      }

      setSessionState('signed-in');
      setAllowed(access.allowed);
      setRole(access.role);

      if (access.allowed) {
        await loadAll();
      } else {
        setLoading(false);
      }
    }

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadAll() {
    if (!id) return;

    setError('');
    setLoading(true);

    try {
      const [applicationRow, documentRows, historyRows, councilorRows] = await Promise.all([
        fetchCertificateApplication(id),
        fetchCertificateDocuments(id),
        fetchCertificateHistory(id),
        fetchWardCouncilors(),
      ]);

      setApplication(applicationRow);
      setDocuments(documentRows);
      setHistory(historyRows);
      setCouncilors(councilorRows);

      const urlEntries = await Promise.all(
        documentRows.map(async (document) => [document.id, await createCertificateDocumentSignedUrl(document.storage_path)] as const),
      );
      setDocumentUrls(Object.fromEntries(urlEntries.filter(([, url]) => Boolean(url)) as Array<[string, string]>));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load certificate application.');
    } finally {
      setLoading(false);
    }
  }

  function handleIssuedFileChange(file: File | null) {
    setError('');

    if (!file) {
      setIssuedFile(null);
      return;
    }

    try {
      validateCertificateDocument(file);
      setIssuedFile(file);
    } catch (fileError) {
      setIssuedFile(null);
      setError(fileError instanceof Error ? fileError.message : 'Invalid certificate file.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;

    setError('');
    setSuccess('');
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const nextStatus = getFormValue(form, 'status') as CertificateApplicationStatus;
    const nextCouncilorStatus = getFormValue(form, 'councilorStatus') as 'pending' | 'verified' | 'rejected';
    let issuedUpload = null;
    let issuedPath = application.issued_certificate_path;

    try {
      if (issuedFile && canTownUpdate) {
        issuedUpload = await uploadIssuedCertificateFile(application.id, issuedFile);
        issuedPath = issuedUpload.storage_path;
      }

      await updateCertificateApplication(
        {
          id: application.id,
          status: nextStatus,
          councilorStatus: nextCouncilorStatus,
          assignedCouncilorId: getFormValue(form, 'assignedCouncilorId') || null,
          councilorRemarks: getFormValue(form, 'councilorRemarks') || null,
          townRemarks: getFormValue(form, 'townRemarks') || null,
          publicRemarks: getFormValue(form, 'publicRemarks') || null,
          certificateNumber: getFormValue(form, 'certificateNumber') || null,
          issuedCertificatePath: issuedPath,
        },
        issuedUpload,
      );

      setSuccess('Certificate application updated successfully.');
      setIssuedFile(null);
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update certificate application.');
    } finally {
      setSaving(false);
    }
  }

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="Certificate Application"
        title={application ? application.tracking_no : 'Application detail'}
        description="Verify ward details, review documents, update public status and upload the prepared certificate."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/certificates" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Certificates
          </Link>
          <button type="button" onClick={loadAll} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading application...
          </div>
        ) : null}

        {allowed === false ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">Your account cannot manage certificate applications.</p>
          </div>
        ) : null}

        {!loading && allowed && !application ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">Application not found</h2>
          </div>
        ) : null}

        {application ? (
          <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Tracking Number</p>
                    <h2 className="font-mono text-2xl font-black text-slate-950">{application.tracking_no}</h2>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${certificateStatusBadgeClasses[application.status]}`}>
                    {certificateStatusLabels[application.status]}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Info label="Certificate Type" value={certificateTypeLabels[application.certificate_type]} />
                  <Info label="Current Status" value={certificateStatusLabels[application.status]} />
                  <Info label="Applicant" value={`${application.applicant_name}\n${application.applicant_mobile}\n${application.applicant_cnic || 'CNIC not provided'}`} />
                  <Info label="Relation / Address" value={`${application.applicant_relation || '—'}\n${application.applicant_address}`} />
                  <Info label="Area / Ward" value={`${application.area}\n${application.ward}${application.mohalla ? `\n${application.mohalla}` : ''}`} />
                  <Info label="Subject / Event" value={`${application.subject_name}\n${application.subject_cnic || 'No CNIC / B-form'}\n${new Date(application.event_date).toLocaleDateString()} · ${application.event_place}`} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">Submitted details</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {Object.entries(application.form_data ?? {}).filter(([, value]) => Boolean(value)).map(([key, value]) => (
                    <Info key={key} label={key.replace(/([A-Z])/g, ' $1')} value={String(value)} />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">Uploaded documents</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {documents.map((document) => (
                    <div key={document.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <p className="text-sm font-bold text-slate-950">{certificateDocumentLabels[document.kind]}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{document.file_name || document.storage_path}</p>
                      {documentUrls[document.id] ? (
                        <a href={documentUrls[document.id]} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-bold text-white hover:bg-civic-800">
                          <Download className="mr-1 h-3.5 w-3.5" /> Open Document
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">Verification & certificate update</h3>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Status</span>
                    <select name="status" defaultValue={application.status} disabled={!canTownUpdate} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100">
                      {statusOptions.map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Assigned General Councilor</span>
                    <select name="assignedCouncilorId" defaultValue={application.assigned_councilor_id ?? ''} disabled={!canTownUpdate} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100">
                      <option value="">Auto / not assigned</option>
                      {sameWardCouncilors.map((councilor) => <option key={councilor.id} value={councilor.id}>{councilor.full_name} · {councilor.ward}</option>)}
                      {councilors.filter((c) => !sameWardCouncilors.some((same) => same.id === c.id)).map((councilor) => <option key={councilor.id} value={councilor.id}>{councilor.full_name} · {councilor.ward}</option>)}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Councilor Verification</span>
                    <select name="councilorStatus" defaultValue={application.councilor_status} disabled={!canCouncilorVerify} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100">
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>

                  <TextArea label="Councilor Remarks" name="councilorRemarks" defaultValue={application.councilor_remarks ?? ''} disabled={!canCouncilorVerify} />
                  <TextArea label="Town Internal Remarks" name="townRemarks" defaultValue={application.town_remarks ?? ''} disabled={!canTownUpdate} />
                  <TextArea label="Public Remarks" name="publicRemarks" defaultValue={application.public_remarks ?? ''} />

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Certificate Number</span>
                    <input name="certificateNumber" defaultValue={application.certificate_number ?? ''} disabled={!canTownUpdate} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100" />
                  </label>

                  {canTownUpdate ? (
                    <label className="flex cursor-pointer flex-col rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:bg-slate-100">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <FileUp className="h-4 w-4 text-civic-700" /> Upload prepared certificate
                      </span>
                      <span className="mt-1 text-xs text-slate-500">PDF/JPG/PNG/WEBP, max 10MB.</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(event) => handleIssuedFileChange(event.target.files?.[0] ?? null)} />
                      {issuedFile ? <span className="mt-2 truncate text-xs font-semibold text-civic-700">Selected: {issuedFile.name}</span> : null}
                    </label>
                  ) : null}

                  {application.issued_certificate_path ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Certificate file already uploaded.</p> : null}
                  {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{success}</p> : null}
                  {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

                  <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">Status timeline</h3>
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? <p className="text-sm text-slate-500">No official updates yet.</p> : null}
                  {history.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                      <p className="text-sm font-bold text-slate-950">{certificateStatusLabels[item.status]}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.changed_at)}</p>
                      {item.public_remarks ? <p className="mt-2 text-sm text-slate-700">Public: {item.public_remarks}</p> : null}
                      {item.internal_remarks ? <p className="mt-1 text-xs text-slate-500">Internal: {item.internal_remarks}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </form>
        ) : null}
      </section>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TextArea({ label, name, defaultValue, disabled }: { label: string; name: string; defaultValue: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea name={name} rows={3} defaultValue={defaultValue} disabled={disabled} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100" />
    </label>
  );
}
