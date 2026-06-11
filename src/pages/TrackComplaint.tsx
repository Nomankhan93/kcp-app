import { FormEvent, useState } from 'react';
import { CheckCircle2, Circle, Clock3, Loader2, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { categoryLabels, statusLabels } from '../lib/constants';
import { trackComplaint } from '../lib/complaints';
import type { ComplaintStatus, ComplaintTimelineItem, PublicComplaint } from '../lib/types';

const standardSteps: ComplaintStatus[] = ['submitted', 'received', 'in_progress', 'resolved'];

function nextComplaintStep(status: ComplaintStatus) {
  if (status === 'submitted') return 'Next step: Town Committee staff will receive and review your complaint.';
  if (status === 'received') return 'Next step: The complaint will be assigned or moved to in-progress status.';
  if (status === 'in_progress') return 'Next step: The relevant department will update resolution remarks.';
  if (status === 'resolved') return 'Completed: Please review the official public remarks.';
  if (status === 'rejected') return 'Closed: The complaint was rejected. Please read the official remarks for reason.';
  return 'Closed: This complaint was marked not related to Town Committee services.';
}

export function TrackComplaint() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complaint, setComplaint] = useState<PublicComplaint | null>(null);
  const [timeline, setTimeline] = useState<ComplaintTimelineItem[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setComplaint(null);
    setTimeline([]);
    setSearched(false);
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      const result = await trackComplaint(String(form.get('trackingNo') || ''), String(form.get('mobile') || ''));
      setComplaint(result.complaint);
      setTimeline(result.timeline);
      setSearched(true);
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : 'Unable to track complaint.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Complaint Tracking"
        title="Track complaint status"
        description="Enter your tracking number and mobile number to view the current public status of your complaint. Private contact details and internal remarks are not shown here."
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Tracking Number</span>
            <input
              name="trackingNo"
              required
              placeholder="KCP-2026-000001"
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

        {searched && !complaint ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">No complaint found</h2>
            <p className="mt-2 text-sm text-slate-600">Please check your tracking number and mobile number.</p>
          </div>
        ) : null}

        {complaint ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">Tracking Number</p>
                    <h2 className="font-mono text-2xl font-black text-slate-950">{complaint.tracking_no}</h2>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>

                <StatusProgress status={complaint.status} />

                <div className="mt-5 rounded-2xl bg-civic-50 p-4 text-sm text-civic-900 ring-1 ring-civic-100">
                  <p className="font-bold">Current status: {statusLabels[complaint.status]}</p>
                  <p className="mt-1">{nextComplaintStep(complaint.status)}</p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Info label="Category" value={complaint.category_name || categoryLabels[complaint.category]} />
                  <Info label="Area / Ward" value={`${complaint.area}${complaint.ward ? ` · ${complaint.ward}` : ''}`} />
                  <Info label="Mohalla / Street" value={complaint.mohalla || 'Not provided'} />
                  <Info label="Assigned Department" value={complaint.assigned_department || 'Not assigned yet'} />
                  <Info label="Submitted Date" value={new Date(complaint.created_at).toLocaleString()} />
                  <Info label="Last Updated" value={new Date(complaint.updated_at).toLocaleString()} />
                  <div className="sm:col-span-2">
                    <Info label="Official Public Remarks" value={complaint.public_remarks || 'No remarks added yet.'} />
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Clock3 className="h-5 w-5 text-civic-700" />
                <h3 className="font-bold text-slate-950">Status Timeline</h3>
              </div>

              <div className="mt-4 space-y-4">
                {timeline.length === 0 ? (
                  <p className="text-sm text-slate-500">Timeline will appear after staff updates the complaint.</p>
                ) : null}

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

function StatusProgress({ status }: { status: ComplaintStatus }) {
  const currentIndex = standardSteps.indexOf(status);
  const closedEarly = status === 'rejected' || status === 'not_related';

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {standardSteps.map((step, index) => {
          const done = !closedEarly && currentIndex >= index;
          const active = status === step;
          return (
            <div key={step} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
              {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-slate-300" />}
              <span className={`text-xs font-bold ${active ? 'text-civic-800' : done ? 'text-slate-800' : 'text-slate-500'}`}>
                {statusLabels[step]}
              </span>
            </div>
          );
        })}
      </div>
      {closedEarly ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
          This complaint was closed before the normal resolution path.
        </p>
      ) : null}
    </div>
  );
}

function TimelineItem({ item, isLast }: { item: ComplaintTimelineItem; isLast: boolean }) {
  return (
    <div className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-civic-50 text-civic-700 ring-1 ring-civic-100">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        {!isLast ? <span className="mt-2 h-full min-h-8 w-px bg-slate-200" /> : null}
      </div>
      <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-sm font-bold text-slate-950">{statusLabels[item.status]}</p>
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
