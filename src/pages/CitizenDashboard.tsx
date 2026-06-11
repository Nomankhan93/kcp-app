import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, FileCheck2, Loader2, LogOut, PlusCircle, Search, UserCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { AlertBox, EmptyState, LoadingPanel } from '../components/ui/Feedback';
import { ProgressMeter } from '../components/ui/DataDisplay';
import {
  calculateProfileCompletion,
  claimCitizenRecord,
  fetchCitizenNotifications,
  fetchCitizenProfile,
  fetchMyCitizenCertificates,
  fetchMyCitizenComplaints,
  formatCitizenStatus,
  getCitizenAuthState,
  isCitizenActionRequired,
  signOutCitizen,
} from '../lib/citizenAuth';
import type { CitizenCertificateSummaryRow, CitizenComplaintSummaryRow, CitizenNotificationRow, CitizenProfileRow } from '../lib/types';

export function CitizenDashboard() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<CitizenProfileRow | null>(null);
  const [complaints, setComplaints] = useState<CitizenComplaintSummaryRow[]>([]);
  const [certificates, setCertificates] = useState<CitizenCertificateSummaryRow[]>([]);
  const [notifications, setNotifications] = useState<CitizenNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimError, setClaimError] = useState('');

  const profileCompletion = useMemo(() => calculateProfileCompletion(profile), [profile]);
  const unreadNotifications = notifications.filter((item) => !item.is_read).length;
  const actionRequiredCertificates = certificates.filter((item) => isCitizenActionRequired(item.status));

  async function loadDashboard() {
    setLoading(true);
    const auth = await getCitizenAuthState();
    if (!auth.signedIn) {
      navigate('/citizen/login');
      return;
    }

    setEmail(auth.email);
    const [profileData, complaintData, certificateData, notificationData] = await Promise.all([
      fetchCitizenProfile(),
      fetchMyCitizenComplaints(),
      fetchMyCitizenCertificates(),
      fetchCitizenNotifications(),
    ]);

    setProfile(profileData);
    setComplaints(complaintData);
    setCertificates(certificateData);
    setNotifications(notificationData);
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleSignOut() {
    await signOutCitizen();
    navigate('/citizen/login');
  }

  async function handleClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClaiming(true);
    setClaimMessage('');
    setClaimError('');

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const recordType = String(form.get('recordType') || 'complaint') as 'complaint' | 'certificate';
    const trackingNo = String(form.get('trackingNo') || '').trim();
    const mobile = String(form.get('mobile') || '').trim();

    try {
      const result = await claimCitizenRecord(recordType, trackingNo, mobile);
      if (result.claimed) {
        setClaimMessage(result.message);
        formElement.reset();
        await loadDashboard();
      } else {
        setClaimError(result.message);
      }
    } catch (claimErrorValue) {
      setClaimError(claimErrorValue instanceof Error ? claimErrorValue.message : 'Unable to link record.');
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadingPanel message="Loading citizen dashboard..." />
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Citizen Account"
        title="Citizen dashboard"
        description="Track complaints, certificate applications, action-required items and account notifications from one secure citizen account."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-civic-50 p-3 text-civic-800">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-civic-700">Signed in</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{profile?.full_name || email || 'Citizen Account'}</h2>
                <p className="mt-1 text-sm text-slate-500">{profile?.mobile ? `Mobile: ${profile.mobile}` : 'Complete your profile to make future applications easier.'}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Profile completion</span>
                    <span>{profileCompletion}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-civic-700" style={{ width: `${profileCompletion}%` }} />
                  </div>
                  {profileCompletion < 100 ? (
                    <Link to="/citizen/profile" className="mt-2 inline-flex text-xs font-bold text-civic-700 hover:text-civic-900">
                      Complete profile
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:justify-end">
            <Link to="/citizen/notifications" className="inline-flex items-center rounded-2xl bg-civic-50 px-4 py-2 text-sm font-bold text-civic-800 hover:bg-civic-100">
              <Bell className="mr-2 h-4 w-4" /> Notifications {unreadNotifications ? `(${unreadNotifications})` : ''}
            </Link>
            <Link to="/citizen/profile" className="inline-flex items-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200">
              Edit Profile
            </Link>
            <button onClick={handleSignOut} className="inline-flex items-center rounded-2xl bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </button>
          </div>
        </div>

        {actionRequiredCertificates.length ? (
          <div className="mb-6">
            <AlertBox tone="warning" title="Action required">
              <p>Some certificate applications need correction or additional information.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {actionRequiredCertificates.map((item) => (
                  <Link key={item.id} to={`/citizen/certificates/${item.id}`} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                    {item.tracking_no}
                  </Link>
                ))}
              </div>
            </AlertBox>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Complaints" value={complaints.length} />
          <StatCard label="Certificates" value={certificates.length} />
          <StatCard label="Pending Complaints" value={complaints.filter((item) => !['resolved', 'rejected', 'not_related'].includes(item.status)).length} />
          <StatCard label="Open Certificates" value={certificates.filter((item) => !['delivered', 'rejected'].includes(item.status)).length} />
          <StatCard label="Action Required" value={actionRequiredCertificates.length} tone={actionRequiredCertificates.length ? 'warning' : 'normal'} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <div className="space-y-6">
            <Panel title="My complaints" emptyText="No complaints are linked with your citizen account yet.">
              {complaints.map((item) => (
                <ServiceRow
                  key={item.id}
                  title={item.tracking_no}
                  subtitle={`${formatCitizenStatus(item.category)} · ${item.area}${item.ward ? ` · ${item.ward}` : ''}`}
                  status={formatCitizenStatus(item.status)}
                  remarks={item.public_remarks}
                  href={`/citizen/complaints/${item.id}`}
                />
              ))}
            </Panel>

            <Panel title="My certificate applications" emptyText="No certificate applications are linked with your citizen account yet.">
              {certificates.map((item) => (
                <ServiceRow
                  key={item.id}
                  title={item.tracking_no}
                  subtitle={`${formatCitizenStatus(item.certificate_type)} Certificate · ${item.subject_name} · ${item.ward}`}
                  status={formatCitizenStatus(item.status)}
                  remarks={item.public_remarks}
                  href={`/citizen/certificates/${item.id}`}
                  highlight={isCitizenActionRequired(item.status)}
                />
              ))}
            </Panel>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">Link existing tracking record</h3>
              <p className="mt-2 text-sm text-slate-500">Already submitted a complaint or certificate before login? Link it by tracking number and mobile number.</p>

              <form onSubmit={handleClaim} className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Record Type</span>
                  <select name="recordType" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">
                    <option value="complaint">Complaint</option>
                    <option value="certificate">Certificate Application</option>
                  </select>
                </label>
                <Field label="Tracking Number" name="trackingNo" required placeholder="KCP-2026-000001" />
                <Field label="Mobile Number" name="mobile" required placeholder="03xxxxxxxxx" />

                {claimError ? <AlertBox tone="error" compact>{claimError}</AlertBox> : null}
                {claimMessage ? <AlertBox tone="success" compact>{claimMessage}</AlertBox> : null}

                <button type="submit" disabled={claiming} className="inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-4 py-3 text-sm font-bold text-white hover:bg-civic-800 disabled:opacity-70">
                  {claiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Link Record
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-civic-100 bg-civic-50 p-6 text-civic-950">
              <h3 className="text-lg font-black">Quick citizen services</h3>
              <div className="mt-4 grid gap-2">
                <Link to="/submit" className="inline-flex items-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-civic-800 shadow-sm hover:bg-civic-100">
                  <PlusCircle className="mr-2 h-4 w-4" /> Submit New Complaint
                </Link>
                <Link to="/certificates/apply" className="inline-flex items-center rounded-2xl bg-white px-4 py-3 text-sm font-bold text-civic-800 shadow-sm hover:bg-civic-100">
                  <FileCheck2 className="mr-2 h-4 w-4" /> Apply for Certificate
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({ label, value, tone = 'normal' }: { label: string; value: number; tone?: 'normal' | 'warning' }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function Panel({ title, emptyText, children }: { title: string; emptyText: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">{hasChildren ? children : <EmptyState title="Nothing linked yet" description={emptyText} />}</div>
    </div>
  );
}

function ServiceRow({ title, subtitle, status, remarks, href, highlight = false }: { title: string; subtitle: string; status: string; remarks: string | null; href: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          {remarks ? <p className="mt-2 text-xs text-slate-500">{remarks}</p> : null}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-civic-800 ring-1 ring-civic-100">{status}</span>
      </div>
      <Link to={href} className="mt-3 inline-flex text-xs font-bold text-civic-700 hover:text-civic-900">
        View details
      </Link>
    </div>
  );
}

function Field({ label, name, required = false, placeholder = '' }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input name={name} required={required} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2" />
    </label>
  );
}
