import { FormEvent, useState } from 'react';
import { CheckCircle2, Circle, Clock3, Download, FileCheck2, Loader2, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { certificateStatusBadgeClasses, certificateStatusLabels, certificateTypeLabels } from '../lib/constants';
import { createIssuedCertificateSignedUrl, trackCertificateApplication } from '../lib/certificates';
import type { CertificateApplicationStatus, CertificateStatusHistoryRow, PublicCertificateApplication } from '../lib/types';

const standardSteps: CertificateApplicationStatus[] = [
  'submitted',
  'councilor_review',
  'councilor_verified',
  'town_review',
  'certificate_uploaded',
  'ready_for_collection',
  'delivered',
];

function nextCertificateStep(status: CertificateApplicationStatus) {
  if (status === 'submitted') return 'Next step: Your application will be sent for ward General Councilor review.';
  if (status === 'councilor_review') return 'Next step: Your assigned ward General Councilor will verify the application details.';
  if (status === 'councilor_verified') return 'Next step: Town Committee office will start final certificate processing.';
  if (status === 'town_review') return 'Next step: Certificate officer will prepare or upload the certificate after final checks.';
  if (status === 'need_more_info') return 'Action needed: Please follow the official remarks and provide correction or missing information.';
  if (status === 'certificate_uploaded') return 'Next step: Download/view the uploaded certificate or wait for collection instructions.';
  if (status === 'ready_for_collection') return 'Next step: Visit the office according to official collection instructions.';
  if (status === 'delivered') return 'Completed: Certificate has been delivered/closed in the system.';
  if (status === 'councilor_rejected') return 'Closed: Ward verification rejected the application. Please read official remarks.';
  return 'Closed: The application was rejected. Please read official remarks for reason.';
}

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
      const trackingNo = String(form.get('trackingNo') || '');
      const mobile = String(form.get('mobile') || '');
      const result = await trackCertificateApplication(trackingNo, mobile);
      setApplication(result.application);
      setTimeline(result.timeline);

      if (result.application?.issued_certificate_path) {
        setIssuedCertificateUrl(await createIssuedCertificateSignedUrl(result.application.issued_certificate_path, { trackingNo, mobile }));
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

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
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
              inputMode="tel"
              autoComplete="tel"
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
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
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

              <CertificateProgress status={application.status} />

              <div className="mt-5 rounded-2xl bg-civic-50 p-4 text-sm text-civic-900 ring-1 ring-civic-100">
                <p className="font-bold">Current status: {certificateStatusLabels[application.status]}</p>
                <p className="mt-1">{nextCertificateStep(application.status)}</p>
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
                  <TimelineItem key={`${item.status}-${item.changed_at}-${index}`} item={item} isLast={index === timeline.length - 1} />
                ))}
              </div>
            </aside>
          </div>
        ) : null}
      </section>
    </>
  );
}

function CertificateProgress({ status }: { status: CertificateApplicationStatus }) {
  const currentIndex = standardSteps.indexOf(status);
  const closedEarly = status === 'rejected' || status === 'councilor_rejected';
  const needsInfo = status === 'need_more_info';

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {standardSteps.map((step, index) => {
          const done = !closedEarly && !needsInfo && currentIndex >= index;
          const active = status === step;
          return (
            <div key={step} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
              <span className={`text-xs font-bold ${active ? 'text-civic-800' : done ? 'text-slate-800' : 'text-slate-500'}`}>
                {certificateStatusLabels[step]}
              </span>
            </div>
          );
        })}
      </div>
      {closedEarly || needsInfo ? (
        <p className={`mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold ring-1 ${needsInfo ? 'text-orange-700 ring-orange-100' : 'text-rose-700 ring-rose-100'}`}>
          {needsInfo ? 'This application needs correction or more information before it can continue.' : 'This application was closed before the normal delivery path.'}
        </p>
      ) : null}
    </div>
  );
}

function TimelineItem({ item, isLast }: { item: CertificateStatusHistoryRow; isLast: boolean }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-civic-50 text-civic-700 ring-1 ring-civic-100">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        {!isLast ? <span className="mt-2 h-full min-h-8 w-px bg-slate-200" /> : null}
      </div>
      <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-950">{certificateStatusLabels[item.status]}</p>
        <p className="mt-1 text-xs text-slate-500">{new Date(item.changed_at).toLocaleString()}</p>
        {item.public_remarks ? <p className="mt-2 text-sm text-slate-700">{item.public_remarks}</p> : null}
      </div>
    </div>
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
