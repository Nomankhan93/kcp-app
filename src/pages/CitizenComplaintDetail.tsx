import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { InfoItem } from '../components/ui/DataDisplay';
import { AlertBox, EmptyState, LoadingPanel } from '../components/ui/Feedback';
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
          <LoadingPanel message="Loading complaint details..." />
        ) : error ? (
          <AlertBox tone="error">{error}</AlertBox>
        ) : !complaint ? (
          <EmptyState title="Complaint not found" description="This complaint is either not linked with your citizen account or the tracking record is unavailable." />
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
                <InfoItem label="Category" value={formatCitizenStatus(complaint.category)} />
                <InfoItem label="Department" value={complaint.assigned_department || 'Not assigned yet'} />
                <InfoItem label="Area" value={complaint.area} />
                <InfoItem label="Ward" value={complaint.ward || 'Not provided'} />
                <InfoItem label="Mohalla / Street" value={complaint.mohalla || 'Not provided'} />
                <InfoItem label="Submitted" value={new Date(complaint.created_at).toLocaleString()} />
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
          <EmptyState title="No public timeline yet" description="Official updates will appear here as the office processes your complaint." />
        )}
      </div>
    </div>
  );
}
