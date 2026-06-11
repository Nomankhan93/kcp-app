import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { AlertBox, EmptyState, LoadingPanel } from '../components/ui/Feedback';
import { fetchCitizenNotifications, formatCitizenStatus, getCitizenAuthState, markCitizenNotificationsRead } from '../lib/citizenAuth';
import type { CitizenNotificationRow } from '../lib/types';

export function CitizenNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<CitizenNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    const auth = await getCitizenAuthState();
    if (!auth.signedIn) {
      navigate('/citizen/login');
      return;
    }

    try {
      setNotifications(await fetchCitizenNotifications());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleMarkRead() {
    await markCitizenNotificationsRead();
    await load();
  }

  return (
    <>
      <PageHeader eyebrow="Citizen Account" title="Notifications" description="View important updates about your complaints, certificate applications, corrections and certificate delivery." />
      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link to="/citizen/dashboard" className="inline-flex items-center text-sm font-bold text-civic-700 hover:text-civic-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
          </Link>
          <button onClick={handleMarkRead} className="rounded-2xl bg-civic-700 px-4 py-2 text-sm font-bold text-white hover:bg-civic-800">
            Mark all as read
          </button>
        </div>

        {loading ? (
          <LoadingPanel message="Loading notifications..." />
        ) : error ? (
          <AlertBox tone="error">{error}</AlertBox>
        ) : notifications.length ? (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div key={item.id} className={`rounded-3xl border p-5 shadow-sm ${item.is_read ? 'border-slate-200 bg-white' : 'border-civic-200 bg-civic-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white p-3 text-civic-800 ring-1 ring-civic-100">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-slate-950">{item.title}</h3>
                      <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
                    {item.related_type && item.related_id ? (
                      <Link
                        to={item.related_type === 'complaint' ? `/citizen/complaints/${item.related_id}` : `/citizen/certificates/${item.related_id}`}
                        className="mt-3 inline-flex text-xs font-bold text-civic-700 hover:text-civic-900"
                      >
                        Open {formatCitizenStatus(item.related_type)}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications yet" description="Important complaint and certificate updates will appear here after your records are linked with this citizen account." />
        )}
      </section>
    </>
  );
}
