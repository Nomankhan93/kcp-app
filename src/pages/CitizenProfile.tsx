import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { AlertBox, LoadingPanel } from '../components/ui/Feedback';
import { fetchCitizenProfile, getCitizenAuthState, saveCitizenProfile } from '../lib/citizenAuth';
import type { CitizenProfileRow } from '../lib/types';

function getValue(form: FormData, key: string) {
  return String(form.get(key) || '').trim();
}

export function CitizenProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CitizenProfileRow | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const auth = await getCitizenAuthState();
      if (!auth.signedIn) {
        navigate('/citizen/login');
        return;
      }
      setEmail(auth.email);
      setProfile(await fetchCitizenProfile());
      setLoading(false);
    }

    void load();
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const form = new FormData(event.currentTarget);

    try {
      const saved = await saveCitizenProfile({
        fullName: getValue(form, 'fullName'),
        mobile: getValue(form, 'mobile'),
        cnic: getValue(form, 'cnic'),
        address: getValue(form, 'address'),
        area: getValue(form, 'area'),
        ward: getValue(form, 'ward'),
        mohalla: getValue(form, 'mohalla'),
      });
      setProfile(saved);
      setMessage('Profile saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <LoadingPanel message="Loading citizen profile..." />
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Citizen Account"
        title="Citizen profile"
        description="Save your basic details once. Future citizen services can be linked with your account and tracked from your dashboard."
      />

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/citizen/dashboard" className="mb-4 inline-flex items-center text-sm font-bold text-civic-700 hover:text-civic-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
        </Link>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Signed in as <span className="font-bold text-slate-900">{email}</span>
          </p>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name" name="fullName" required defaultValue={profile?.full_name ?? ''} />
            <Field label="Mobile Number" name="mobile" required defaultValue={profile?.mobile ?? ''} placeholder="03xxxxxxxxx" />
            <Field label="CNIC" name="cnic" defaultValue={profile?.cnic ?? ''} placeholder="xxxxx-xxxxxxx-x" />
            <Field label="Ward" name="ward" defaultValue={profile?.ward ?? ''} placeholder="Ward 01" />
            <Field label="Area" name="area" defaultValue={profile?.area ?? ''} placeholder="Main Bazaar" />
            <Field label="Mohalla / Street" name="mohalla" defaultValue={profile?.mohalla ?? ''} />
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Address</span>
              <textarea
                name="address"
                rows={3}
                defaultValue={profile?.address ?? ''}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
              />
            </label>
          </div>

          {error ? <div className="mt-4"><AlertBox tone="error" compact>{error}</AlertBox></div> : null}
          {message ? <div className="mt-4"><AlertBox tone="success" compact>{message}</AlertBox></div> : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-civic-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Profile
          </button>
        </form>
      </section>
    </>
  );
}

function Field({ label, name, defaultValue = '', required = false, placeholder = '' }: { label: string; name: string; defaultValue?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2"
      />
    </label>
  );
}
