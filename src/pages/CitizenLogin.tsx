import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { signInCitizen, signUpCitizen } from '../lib/citizenAuth';

export function CitizenLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const fullName = String(form.get('fullName') || '').trim();

    try {
      if (mode === 'signup') {
        if (!fullName) throw new Error('Full name is required for citizen signup.');
        await signUpCitizen(email, password, fullName);
        setMessage('Citizen account created. If email confirmation is enabled, please verify your email before login.');
      } else {
        await signInCitizen(email, password);
        navigate('/citizen/dashboard');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to continue.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Citizen Account"
        title="Citizen login / signup"
        description="Create a citizen account to save your profile, link your complaint and certificate tracking numbers, and view your own service history from one dashboard."
      />

      <section className="mx-auto max-w-md px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setMessage('');
            }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode === 'login' ? 'bg-white text-civic-800 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setMessage('');
            }}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode === 'signup' ? 'bg-white text-civic-800 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
          >
            Signup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {mode === 'signup' ? (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Full Name</span>
              <input
                name="fullName"
                type="text"
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
              />
            </label>
          ) : null}

          <label className={mode === 'signup' ? 'mt-4 block' : 'block'}>
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
              minLength={6}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
            />
          </label>

          {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {mode === 'login' ? 'Login to Citizen Dashboard' : 'Create Citizen Account'}
          </button>

          <Link to="/citizen/dashboard" className="mt-4 block text-center text-sm font-semibold text-civic-700 hover:text-civic-900">
            Go to citizen dashboard
          </Link>
        </form>
      </section>
    </>
  );
}
