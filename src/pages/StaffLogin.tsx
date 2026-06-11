import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { supabase } from '../lib/supabase';

type PortalRole = 'admin' | 'chairman' | 'staff' | 'certificate_officer' | 'general_councilor' | string | null;

function roleRedirectPath(role: PortalRole) {
  switch (role) {
    case 'admin':
    case 'staff':
      return '/admin';
    case 'chairman':
      return '/admin/chairman-dashboard';
    case 'certificate_officer':
      return '/admin/certificates/final-processing';
    case 'general_councilor':
      return '/councilor/certificates';
    default:
      return null;
  }
}

function roleLabel(role: PortalRole) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'chairman':
      return 'Chairman';
    case 'staff':
      return 'Staff';
    case 'certificate_officer':
      return 'Certificate Officer';
    case 'general_councilor':
      return 'General Councilor';
    default:
      return 'Unknown role';
  }
}

export function StaffLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw new Error(signInError.message);
      }

      const { data: roleData, error: roleError } = await supabase.rpc('current_portal_role');

      if (roleError) {
        await supabase.auth.signOut();
        throw new Error('Unable to verify your portal role. Please contact the system administrator.');
      }

      const role = typeof roleData === 'string' ? roleData : null;
      const redirectTo = roleRedirectPath(role);

      if (!redirectTo) {
        await supabase.auth.signOut();
        throw new Error('This account is not assigned to Staff, Admin, Chairman, Certificate Officer, or General Councilor access.');
      }

      window.location.href = redirectTo;
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to login.');
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Staff Portal"
        title="Town Committee staff login"
        description="Authorized staff, Admin, Chairman, Certificate Officer, and Ward General Councilors can sign in here. After login, the portal will redirect each user to the correct dashboard based on role."
      />

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3 rounded-2xl bg-civic-50 px-4 py-3 text-civic-900">
            <ShieldCheck className="h-5 w-5 flex-none" />
            <p className="text-sm font-semibold">Use your official Town Committee portal account.</p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>

          {error ? (
            <div className="mt-4 flex gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
              <p>{error}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Login to Staff Portal
          </button>

          <Link to="/citizen/login" className="mt-4 block text-center text-sm font-semibold text-civic-700 hover:text-civic-900">
            Citizen account login
          </Link>
        </form>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">Role-based redirect</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">One login, correct dashboard</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Internal dashboard links are no longer exposed in the public header. Login here and the portal will open the correct area based on your assigned role.
          </p>

          <div className="mt-5 space-y-2 text-sm">
            {([
              ['admin', '/admin'],
              ['chairman', '/admin/chairman-dashboard'],
              ['staff', '/admin'],
              ['certificate_officer', '/admin/certificates/final-processing'],
              ['general_councilor', '/councilor/certificates'],
            ] as const).map(([role, path]) => (
              <div key={role} className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="font-bold text-slate-900">{roleLabel(role)}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">{path}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </>
  );
}
