import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Bell, Download, FileText, Loader2, LogOut, MessageSquareText, Newspaper } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { checkCmsAccess } from '../lib/cms';
import { supabase } from '../lib/supabase';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

const contentSections = [
  {
    to: '/admin/content/notices',
    title: 'Public Notices',
    description: 'Create and publish notices, alerts and official citizen guidance.',
    icon: Bell,
  },
  {
    to: '/admin/content/news',
    title: 'News / Updates',
    description: 'Publish progress updates, announcements and municipal service news.',
    icon: Newspaper,
  },
  {
    to: '/admin/content/downloads',
    title: 'Downloads / Forms',
    description: 'Upload public forms, PDF documents and downloadable files.',
    icon: Download,
  },
  {
    to: '/admin/content/messages',
    title: 'Leadership Messages',
    description: 'Update MPA and Chairman messages, photos and display order.',
    icon: MessageSquareText,
  },
];

export function AdminContent() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const access = await checkCmsAccess();
      if (!access.signedIn) {
        setSessionState('signed-out');
        return;
      }
      setSessionState('signed-in');
      setAllowed(access.allowed);
      setRole(access.role);
    }
    void init();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  }

  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader
        eyebrow="Public CMS"
        title="Website content management"
        description="Manage public notices, news, downloads and leadership messages without editing code."
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {sessionState === 'checking' ? (
          <div className="flex justify-center py-12 text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking CMS access...
          </div>
        ) : null}

        {allowed === false ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="mt-2 text-sm">Only admin and staff users can manage public website content.</p>
            <button onClick={handleLogout} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white">
              Logout
            </button>
          </div>
        ) : null}

        {allowed ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full bg-civic-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-civic-800 ring-1 ring-civic-100">
                Signed in role: {role ?? 'authorized'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/admin" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <FileText className="mr-2 h-4 w-4" /> Admin Dashboard
                </Link>
                <button onClick={handleLogout} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </button>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {contentSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    key={section.to}
                    to={section.to}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-civic-200 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-civic-50 text-civic-800">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-slate-950">{section.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{section.description}</p>
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
