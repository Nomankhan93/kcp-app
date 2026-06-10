import { FormEvent, useState } from 'react';
import { Clock3, Download, FileCheck2, Loader2, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { certificateStatusBadgeClasses, certificateStatusLabels, certificateTypeLabels } from '../lib/constants';
import { createIssuedCertificateSignedUrl, trackCertificateApplication } from '../lib/certificates';
import type { CertificateStatusHistoryRow, PublicCertificateApplication } from '../lib/types';

export function CertificateTrack() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [application, setApplication] = useState<PublicCertificateApplication | null>(null);
  const [timeline, setTimeline] = useState<CertificateStatusHistoryRow[]>([]);
  const [issuedCertificateUrl, setIssuedCertificateUrl] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setApplication(null);
    setTimeline([]);
    setIssuedCertificateUrl(null);
    setSearched(false);
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const result = await trackCertificateApplication(String(form.get('trackingNo') || ''), String(form.get('mobile') || ''));
      setApplication(result.application);
      setTimeline(result.timeline);

      if (result.application?.issued_certificate_path) {
        setIssuedCertificateUrl(await createIssuedCertificateSignedUrl(result.application.issued_certificate_path));
      }

      setSearched(true);
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : 'Unable to track certificate application.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Certificate Tracking"
        title="Track certificate application"
        description="Enter your certificate tracking number and mobile number to view ward verification and Town Committee certificate status."
      />

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Tracking Number</span>
            <input
              name="trackingNo"
              required
              placeholder="KCP-CERT-2026-000001"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm uppercase outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Mobile Number</span>
            <input
              name="mobile"
              required
              placeholder="03xxxxxxxxx"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-auto inline-flex items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Track
          </button>
        </form>

        {error ? <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

        {searched && !application ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">No certificate application found</h2>
            <p className="mt-2 text-sm text-slate-600">Please check your tracking number and mobile number.</p>
          </div>
        ) : null}

        {application ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Tracking Number</p>
                  <h2 className="font-mono text-2xl font-black text-slate-950">{application.tracking_no}</h2>
                </div>
                <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${certificateStatusBadgeClasses[application.status]}`}>
                  {certificateStatusLabels[application.status]}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Info label="Certificate Type" value={certificateTypeLabels[application.certificate_type]} />
                <Info label="Applicant Name" value={application.applicant_name} />
                <Info label="Subject Name" value={application.subject_name} />
                <Info label="Event Date" value={new Date(application.event_date).toLocaleDateString()} />
                <Info label="Event Place" value={application.event_place} />
                <Info label="Area / Ward" value={`${application.area} · ${application.ward}`} />
                <Info label="Mohalla / Street" value={application.mohalla || 'Not provided'} />
                <Info label="Councilor Verification" value={application.councilor_status.toUpperCase()} />
                <Info label="Certificate Number" value={application.certificate_number || 'Not issued yet'} />
                <Info label="Submitted Date" value={new Date(application.created_at).toLocaleString()} />
                <div className="sm:col-span-2">
                  <Info label="Official Public Remarks" value={application.public_remarks || 'No remarks added yet.'} />
                </div>
              </div>

              {application.status === 'certificate_uploaded' || application.status === 'ready_for_collection' || application.status === 'delivered' ? (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-start gap-3">
                    <FileCheck2 className="mt-0.5 h-5 w-5 flex-none" />
                    <div>
                      <p className="font-bold">Certificate prepared by Town Committee</p>
                      <p className="mt-1">Please verify details carefully. Office collection/delivery rules may still apply.</p>
                      {issuedCertificateUrl ? (
                        <a href={issuedCertificateUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center rounded-xl bg-civic-700 px-3 py-2 text-xs font-bold text-white hover:bg-civic-800">
                          <Download className="mr-1 h-3.5 w-3.5" /> Download / View Certificate
                        </a>
                      ) : application.issued_certificate_path ? (
                        <p className="mt-2 text-xs font-semibold text-amber-800">Certificate file is available, but a secure download link could not be created. Please contact Town Committee office.</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock3 className="h-5 w-5 text-civic-700" />
                <h3 className="font-bold text-slate-950">Status Timeline</h3>
              </div>

              <div className="mt-4 space-y-4">
                {timeline.length === 0 ? <p className="text-sm text-slate-500">Timeline will appear after official updates.</p> : null}

                {timeline.map((item, index) => (
                  <div key={`${item.status}-${item.changed_at}-${index}`} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-sm font-bold text-slate-950">{certificateStatusLabels[item.status]}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(item.changed_at).toLocaleString()}</p>
                    {item.public_remarks ? <p className="mt-2 text-sm text-slate-700">{item.public_remarks}</p> : null}
                  </div>
                ))}
              </div>
            </aside>
          </div>
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
