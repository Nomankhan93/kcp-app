import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, Upload } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import {
  createCitizenCertificateDocumentSignedUrl,
  fetchMyCitizenCertificateDetail,
  fetchMyCitizenCertificateDocuments,
  fetchMyCitizenCertificateTimeline,
  formatCitizenStatus,
  getCitizenAuthState,
  isCitizenActionRequired,
  submitCitizenCertificateCorrection,
  validateCitizenCorrectionDocument,
} from '../lib/citizenAuth';
import type { CitizenCertificateDetailRow, CitizenCertificateDocumentRow } from '../lib/types';

export function CitizenCertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<CitizenCertificateDetailRow | null>(null);
  const [timeline, setTimeline] = useState<Array<{ id: string; status: string; public_remarks: string | null; changed_at: string }>>([]);
  const [documents, setDocuments] = useState<CitizenCertificateDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [correctionFiles, setCorrectionFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const auth = await getCitizenAuthState();
    if (!auth.signedIn) {
      navigate('/citizen/login');
      return;
    }

    if (!id) {
      setError('Certificate application ID is missing.');
      setLoading(false);
      return;
    }

    try {
      const [applicationData, timelineData, documentData] = await Promise.all([
        fetchMyCitizenCertificateDetail(id),
        fetchMyCitizenCertificateTimeline(id),
        fetchMyCitizenCertificateDocuments(id),
      ]);

      const documentsWithUrls = await Promise.all(
        documentData.map(async (item) => ({ ...item, signed_url: await createCitizenCertificateDocumentSignedUrl(item.storage_path) })),
      );

      setApplication(applicationData);
      setTimeline(timelineData);
      setDocuments(documentsWithUrls);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load certificate application.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  function handleFileChange(fileList: FileList | null) {
    setError('');
    const files = Array.from(fileList ?? []);
    try {
      files.forEach(validateCitizenCorrectionDocument);
      setCorrectionFiles(files);
    } catch (fileError) {
      setCorrectionFiles([]);
      setError(fileError instanceof Error ? fileError.message : 'Invalid correction document.');
    }
  }

  async function handleCorrectionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    const form = new FormData(event.currentTarget);
    const response = String(form.get('response') || '').trim();

    try {
      await submitCitizenCertificateCorrection({ applicationId: application.id, response, files: correctionFiles });
      setMessage('Correction response submitted. Your application has been sent back for verification/review.');
      setCorrectionFiles([]);
      event.currentTarget.reset();
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to submit correction response.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Citizen Certificate" title="My certificate application" description="View application details, ward verification status, official timeline and certificate delivery updates." />
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/citizen/dashboard" className="mb-4 inline-flex items-center text-sm font-bold text-civic-700 hover:text-civic-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>

        {loading ? (
          <div className="flex items-center rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading certificate application...
          </div>
        ) : error && !application ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>
        ) : !application ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Certificate application not found or not linked with your account.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-civic-700">Tracking No</p>
                    <h2 className="mt-1 font-mono text-2xl font-black text-slate-950">{application.tracking_no}</h2>
                  </div>
                  <span className="rounded-full bg-civic-50 px-3 py-1 text-xs font-bold text-civic-800 ring-1 ring-civic-100">{formatCitizenStatus(application.status)}</span>
                </div>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Detail label="Certificate Type" value={`${formatCitizenStatus(application.certificate_type)} Certificate`} />
                  <Detail label="Subject Name" value={application.subject_name} />
                  <Detail label="Event Date" value={application.event_date} />
                  <Detail label="Event Place" value={application.event_place} />
                  <Detail label="Ward" value={application.ward} />
                  <Detail label="Area" value={application.area} />
                  <Detail label="Councilor Status" value={formatCitizenStatus(application.councilor_status)} />
                  <Detail label="Certificate No" value={application.certificate_number || 'Not issued yet'} />
                </dl>

                {application.public_remarks ? (
                  <div className="mt-4 rounded-2xl bg-civic-50 p-4 text-civic-950">
                    <p className="text-sm font-bold">Latest public remarks</p>
                    <p className="mt-2 text-sm leading-6">{application.public_remarks}</p>
                  </div>
                ) : null}

                {application.issued_certificate_path ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                    <p className="text-sm font-black">Prepared certificate available</p>
                    <p className="mt-1 text-sm">Use the public tracking page with tracking number and mobile number to view/download the official certificate.</p>
                    <Link to="/certificates/track" className="mt-3 inline-flex items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                      <Download className="mr-2 h-4 w-4" /> Open certificate tracking
                    </Link>
                  </div>
                ) : null}
              </div>

              {isCitizenActionRequired(application.status) ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
                  <h3 className="text-lg font-black">Correction / additional information required</h3>
                  <p className="mt-2 text-sm leading-6">Submit your response and upload replacement/additional documents. The application will return to ward verification or office review.</p>

                  <form onSubmit={handleCorrectionSubmit} className="mt-5 space-y-4">
                    <label className="block">
                      <span className="text-sm font-semibold">Citizen Response</span>
                      <textarea name="response" required minLength={10} rows={4} className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-amber-600 transition focus:ring-2" />
                    </label>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-white/70 px-4 py-7 text-center transition hover:bg-white">
                      <Upload className="h-7 w-7 text-amber-700" />
                      <span className="mt-2 text-sm font-semibold">Upload correction documents optional</span>
                      <span className="mt-1 text-xs">JPG, PNG, WEBP or PDF. Max 10MB each.</span>
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(event) => handleFileChange(event.target.files)} />
                      {correctionFiles.length ? <span className="mt-2 text-xs font-bold">{correctionFiles.length} file(s) selected</span> : null}
                    </label>

                    {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
                    {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}

                    <button type="submit" disabled={submitting} className="inline-flex items-center rounded-2xl bg-amber-700 px-5 py-3 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-70">
                      {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Submit Correction Response
                    </button>
                  </form>
                </div>
              ) : null}

              <DocumentsPanel documents={documents} />
            </div>

            <TimelinePanel timeline={timeline} />
          </div>
        )}
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function DocumentsPanel({ documents }: { documents: CitizenCertificateDocumentRow[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">Uploaded documents</h3>
      <div className="mt-4 space-y-3">
        {documents.length ? (
          documents.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-900">{formatCitizenStatus(item.kind)}</p>
              <p className="mt-1 text-xs text-slate-500">{item.file_name || item.storage_path}</p>
              {item.signed_url ? (
                <a href={item.signed_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-civic-700 hover:text-civic-900">
                  View file
                </a>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No documents found.</p>
        )}
      </div>
    </div>
  );
}

function TimelinePanel({ timeline }: { timeline: Array<{ id: string; status: string; public_remarks: string | null; changed_at: string }> }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">Status timeline</h3>
      <div className="mt-4 space-y-3">
        {timeline.length ? (
          timeline.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-900">{formatCitizenStatus(item.status)}</p>
                <p className="text-xs text-slate-500">{new Date(item.changed_at).toLocaleString()}</p>
              </div>
              {item.public_remarks ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.public_remarks}</p> : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">No public timeline yet.</p>
        )}
      </div>
    </div>
  );
}
