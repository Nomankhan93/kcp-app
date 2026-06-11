import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Download, Loader2, RefreshCw, Save, XCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { AlertBox, ConfirmDialog, EmptyState, InlineToast, LoadingPanel, PermissionDeniedState } from '../components/ui/Feedback';
import {
  checkCertificateAccess,
  councilorReviewCertificateApplication,
  createCertificateDocumentSignedUrl,
  fetchCertificateApplication,
  fetchCertificateDocuments,
  fetchCertificateHistory,
  fetchCurrentWardCouncilor,
  type CouncilorProfile,
  type CouncilorReviewAction,
} from '../lib/certificates';
import { certificateDocumentLabels, certificateStatusBadgeClasses, certificateStatusLabels, certificateTypeLabels } from '../lib/constants';
import type { CertificateApplicationRow, CertificateDocumentRow, CertificateStatusHistoryRow } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';
type AccessRole = 'admin' | 'chairman' | 'staff' | 'certificate_officer' | 'general_councilor' | null;

type PendingCouncilorReview = {
  action: CouncilorReviewAction;
  councilorRemarks: string;
  publicRemarks: string;
};

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function getFormValue(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

export function CouncilorCertificateDetail() {
  const { id } = useParams();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [role, setRole] = useState<AccessRole>(null);
  const [profile, setProfile] = useState<CouncilorProfile>(null);
  const [application, setApplication] = useState<CertificateApplicationRow | null>(null);
  const [documents, setDocuments] = useState<CertificateDocumentRow[]>([]);
  const [history, setHistory] = useState<CertificateStatusHistoryRow[]>([]);
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pendingReview, setPendingReview] = useState<PendingCouncilorReview | null>(null);

  const isWardMatch = useMemo(() => {
    if (!profile || !application) return false;
    return profile.ward.trim().toLowerCase() === application.ward.trim().toLowerCase();
  }, [application, profile]);

  const canReview = role === 'general_councilor' && Boolean(profile) && isWardMatch;

  useEffect(() => {
    async function init() {
      const access = await checkCertificateAccess();

      if (!access.signedIn) {
        setSessionState('signed-out');
        setLoading(false);
        return;
      }

      setSessionState('signed-in');
      setRole(access.role);

      if (access.role === 'general_councilor') {
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
      const [councilorProfile, applicationRow, documentRows, historyRows] = await Promise.all([
        fetchCurrentWardCouncilor(),
        fetchCertificateApplication(id),
        fetchCertificateDocuments(id),
        fetchCertificateHistory(id),
      ]);

      setProfile(councilorProfile);
      setApplication(applicationRow);
      setDocuments(documentRows);
      setHistory(historyRows);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;

    const form = new FormData(event.currentTarget);
    const action = getFormValue(form, 'action') as CouncilorReviewAction;
    const councilorRemarks = getFormValue(form, 'councilorRemarks');
    const publicRemarks = getFormValue(form, 'publicRemarks');

    if (action === 'rejected') {
      setPendingReview({ action, councilorRemarks, publicRemarks });
      return;
    }

    await saveReview({ action, councilorRemarks, publicRemarks });
  }

  async function saveReview(review: PendingCouncilorReview) {
    if (!application) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await councilorReviewCertificateApplication({
        applicationId: application.id,
        action: review.action,
        councilorRemarks: review.councilorRemarks,
        publicRemarks: review.publicRemarks,
      });

      setSuccess('Ward verification update saved successfully.');
      await loadAll();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save councilor verification.');
    } finally {
      setSaving(false);
    }
  }


  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="Ward Verification"
        title={application ? application.tracking_no : 'Certificate application review'}
        description="Verify applicant ward details and supporting documents before Town Committee prepares the final certificate."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/councilor/certificates" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Ward Applications
          </Link>
          <button type="button" onClick={loadAll} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </button>
        </div>

        {role && role !== 'general_councilor' ? (
          <AlertBox tone="warning" title="General Councilor role required">
            <p>This screen is reserved for ward General Councilor verification. Admin/chairman users should use the admin certificate detail page.</p>
            {id ? <Link to={`/admin/certificates/${id}`} className="mt-4 inline-flex rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800">Open Admin Detail</Link> : null}
          </AlertBox>
        ) : null}

        {loading ? <LoadingPanel message="Loading application..." /> : null}

        {!loading && role === 'general_councilor' && !profile ? (
          <PermissionDeniedState title="Ward assignment missing" description="Your account has general_councilor role, but no active ward is assigned in ward_councilors." />
        ) : null}

        {!loading && role === 'general_councilor' && profile && application && !isWardMatch ? (
          <AlertBox tone="error" title="This application is not from your ward">Your assigned ward is {profile.ward}. This application belongs to {application.ward}.</AlertBox>
        ) : null}

        {!loading && role === 'general_councilor' && !application ? (
          <EmptyState title="Application not found" description="This certificate application could not be loaded for your assigned ward." />
        ) : null}

        {application && role === 'general_councilor' && profile ? (
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
                  <Info label="Councilor Responsibility" value={`${profile.full_name}\n${profile.ward}\n${profile.designation ?? 'General Councilor'}`} />
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
                <h3 className="text-lg font-black text-slate-950">Supporting documents</h3>
                <p className="mt-1 text-sm text-slate-500">Open each document and verify that the applicant belongs to your ward before action.</p>
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
                <h3 className="text-lg font-black text-slate-950">Ward verification action</h3>
                <p className="mt-1 text-sm text-slate-500">Remarks are required because the General Councilor is responsible for ward verification.</p>

                <div className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-700">Action</span>
                    <select name="action" disabled={!canReview} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100">
                      <option value="verified">Verify and forward to Town Committee</option>
                      <option value="need_correction">Need correction / more information</option>
                      <option value="rejected">Reject ward verification</option>
                    </select>
                  </label>

                  <TextArea label="Councilor Remarks" name="councilorRemarks" defaultValue={application.councilor_remarks ?? ''} disabled={!canReview} required />
                  <TextArea label="Public Remarks for Citizen" name="publicRemarks" defaultValue={application.public_remarks ?? ''} disabled={!canReview} />

                  <AlertBox tone="warning" title="Responsibility note" compact>Only verify when applicant details, ward/address and supporting documents are checked. This action will be recorded with your user account and date/time.</AlertBox>

                  {success ? <InlineToast tone="success" message={success} onDismiss={() => setSuccess('')} /> : null}
                  {error ? <InlineToast tone="error" message={error} onDismiss={() => setError('')} /> : null}

                  <button type="submit" disabled={saving || !canReview} className="inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Ward Verification
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">Current verification</h3>
                <div className="mt-4 space-y-3">
                  <MiniStatus label="Councilor Status" value={application.councilor_status} ok={application.councilor_status === 'verified'} danger={application.councilor_status === 'rejected'} />
                  <Info label="Verified At" value={application.councilor_verified_at ? formatDateTime(application.councilor_verified_at) : 'Pending'} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-slate-950">Timeline</h3>
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? <EmptyState title="No official updates yet" description="Ward verification and office processing updates will appear here." /> : null}
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
      <ConfirmDialog
        open={Boolean(pendingReview)}
        title="Reject ward verification?"
        description={(
          <span>
            You are about to reject application <strong>{application?.tracking_no}</strong> at ward verification stage. This will be recorded against your councilor account and shown in the timeline.
          </span>
        )}
        confirmLabel="Reject Verification"
        tone="error"
        busy={saving}
        onCancel={() => setPendingReview(null)}
        onConfirm={() => {
          if (!pendingReview) return;
          const review = pendingReview;
          setPendingReview(null);
          void saveReview(review);
        }}
      />

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

function TextArea({ label, name, defaultValue, disabled, required }: { label: string; name: string; defaultValue: string; disabled?: boolean; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <textarea name={name} rows={4} defaultValue={defaultValue} disabled={disabled} required={required} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2 disabled:bg-slate-100" />
    </label>
  );
}

function MiniStatus({ label, value, ok, danger }: { label: string; value: string; ok?: boolean; danger?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-2xl p-4 ring-1 ${ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-100' : danger ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-slate-50 text-slate-800 ring-slate-200'}`}>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
        <p className="mt-1 text-sm font-black capitalize">{value.replace('_', ' ')}</p>
      </div>
      {ok ? <CheckCircle2 className="h-5 w-5" /> : danger ? <XCircle className="h-5 w-5" /> : null}
    </div>
  );
}
