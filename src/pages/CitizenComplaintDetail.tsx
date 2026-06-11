import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { fetchMyCitizenComplaintDetail, fetchMyCitizenComplaintTimeline, formatCitizenStatus, getCitizenAuthState } from '../lib/citizenAuth';
import type { CitizenComplaintDetailRow, CitizenComplaintTimelineRow } from '../lib/types';

export function CitizenComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [complaint, setComplaint] = useState<CitizenComplaintDetailRow | null>(null);
  const [timeline, setTimeline] = useState<CitizenComplaintTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const auth = await getCitizenAuthState();
      if (!auth.signedIn) {
        navigate('/citizen/login');
        return;
      }

      if (!id) {
        setError('Complaint ID is missing.');
        setLoading(false);
        return;
      }

      try {
        const [complaintData, timelineData] = await Promise.all([
          fetchMyCitizenComplaintDetail(id),
          fetchMyCitizenComplaintTimeline(id),
        ]);
        setComplaint(complaintData);
        setTimeline(timelineData);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load complaint details.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, navigate]);

  return (
    <>
      <PageHeader eyebrow="Citizen Complaint" title="My complaint details" description="View your submitted complaint, current status, public remarks and official timeline." />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/citizen/dashboard" className="mb-4 inline-flex items-center text-sm font-bold text-civic-700 hover:text-civic-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>

        {loading ? (
          <div className="flex items-center rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading complaint details...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">{error}</div>
        ) : !complaint ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">Complaint not found or not linked with your account.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-civic-700">Tracking No</p>
                  <h2 className="mt-1 font-mono text-2xl font-black text-slate-950">{complaint.tracking_no}</h2>
                </div>
                <span className="rounded-full bg-civic-50 px-3 py-1 text-xs font-bold text-civic-800 ring-1 ring-civic-100">{formatCitizenStatus(complaint.status)}</span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail label="Category" value={formatCitizenStatus(complaint.category)} />
                <Detail label="Department" value={complaint.assigned_department || 'Not assigned yet'} />
                <Detail label="Area" value={complaint.area} />
                <Detail label="Ward" value={complaint.ward || 'Not provided'} />
                <Detail label="Mohalla / Street" value={complaint.mohalla || 'Not provided'} />
                <Detail label="Submitted" value={new Date(complaint.created_at).toLocaleString()} />
              </dl>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">Complaint Details</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{complaint.details}</p>
              </div>

              {complaint.public_remarks ? (
                <div className="mt-4 rounded-2xl bg-civic-50 p-4 text-civic-950">
                  <p className="text-sm font-bold">Latest public remarks</p>
                  <p className="mt-2 text-sm leading-6">{complaint.public_remarks}</p>
                </div>
              ) : null}
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

function TimelinePanel({ timeline }: { timeline: CitizenComplaintTimelineRow[] }) {
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
