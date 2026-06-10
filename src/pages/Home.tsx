import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ClipboardCheck, FileSearch, ShieldCheck, UsersRound } from 'lucide-react';
import { SetupNotice } from '../components/SetupNotice';
import { PublicCard } from '../components/PublicCard';
import { leadershipMessages, publicFeatureLinks, siteInfo } from '../lib/publicContent';

const services = [
  'Sanitation and cleanliness complaints',
  'Street light issues',
  'Drainage and sewerage issues',
  'Water supply requests',
  'Road and street repair complaints',
  'Birth/death record inquiries',
];

export function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-civic-900 via-civic-800 to-emerald-700 text-white">
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-200 blur-3xl" />
        </div>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-100">{siteInfo.townName}</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Public website and complaint tracking portal for Kunri citizens
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50">
              A proposed digital platform for Town Committee Kunri where citizens can access municipal information, public notices, forms, and submit or track service complaints online.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/submit"
                className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-bold text-civic-800 shadow-lg transition hover:bg-emerald-50"
              >
                Submit Complaint <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                to="/leadership-messages"
                className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Leadership Messages
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur">
            <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-civic-50 p-3 text-civic-700">
                  <ClipboardCheck className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">Sample Tracking</p>
                  <p className="font-mono text-xl font-black text-slate-950">KCP-2026-000001</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                {[
                  ['Submit', 'Citizen submits complaint with location and details'],
                  ['Review', 'Town Committee staff receives and assigns complaint'],
                  ['Resolve', 'Final public remarks are updated for citizen tracking'],
                ].map(([label, text]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-bold text-civic-800">{label}</p>
                    <p className="mt-1 text-sm text-slate-600">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SetupNotice />


      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">Leadership Messages</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Messages with official photos</h2>
          <p className="mt-3 text-slate-600">
            Chairman and public representative message sections are ready for approved official content.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {leadershipMessages.map((message) => (
            <Link
              key={message.id}
              to="/leadership-messages"
              className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="grid gap-0 sm:grid-cols-[180px_1fr]">
                <div className="bg-slate-100 p-3">
                  <img
                    src={message.imageUrl}
                    alt={message.imageAlt}
                    className={`h-48 w-full rounded-2xl ${message.imageFit === 'contain' ? 'object-contain' : 'object-cover'} bg-slate-100`}
                  />
                </div>
                <div className="p-5">
                  <div className="inline-flex rounded-2xl bg-civic-50 p-3 text-civic-700">
                    <UsersRound className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-civic-700">{message.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-extrabold text-slate-950 group-hover:text-civic-800">{message.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-slate-700">{message.name}</p>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{message.subtitle}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">Public Website</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-950">Main public sections</h2>
          <p className="mt-3 text-slate-600">
            These pages are prepared as Phase 1 public website structure. Official content can be updated after approval from Town Committee Kunri.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {publicFeatureLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className="block">
                <PublicCard title={item.title} description={item.description} icon={<Icon className="h-6 w-6" />} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={<FileSearch />} title="Public Tracking" text="Citizens can track complaint status with tracking number and mobile number." />
          <FeatureCard icon={<BarChart3 />} title="Chairman Overview" text="Dashboard structure for pending, in-progress, resolved and category-wise performance." />
          <FeatureCard icon={<ShieldCheck />} title="Admin Control" text="Admin users can review, assign, update status and add official remarks." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">Complaint Services</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Municipal service categories</h2>
            <p className="mt-3 text-slate-600">
              These categories can be changed after official approval from Town Committee Kunri.
            </p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div key={service} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                {service}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 inline-flex rounded-2xl bg-civic-50 p-3 text-civic-700">{icon}</div>
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
