import { FormEvent, useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { supabase } from '../lib/supabase';

export function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    const form = new FormData(event.currentTarget);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') || '').trim(),
      password: String(form.get('password') || ''),
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    window.location.href = '/admin';
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin Access"
        title="Admin login"
        description="Authorized Town Committee staff can sign in to manage citizen complaints."
      />

      <section className="mx-auto max-w-md px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>

          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Login
          </button>
        </form>
      </section>
    </>
  );
}
