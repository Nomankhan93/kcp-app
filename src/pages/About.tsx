import { Building2, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { PublicCard } from '../components/PublicCard';
import { quickFacts, siteInfo } from '../lib/publicContent';

const objectives = [
  'Provide a public digital information point for citizens of Kunri.',
  'Enable citizens to submit and track municipal complaints online.',
  'Publish approved public notices, updates and downloadable forms.',
  'Support transparent complaint monitoring for Town Committee administration.',
];

export function About() {
  return (
    <>
      <PageHeader
        eyebrow="Introduction"
        title="Town Committee Kunri public website"
        description="This page introduces the proposed Kunri Citizens Portal and its purpose as an official citizen service and complaint management platform."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex rounded-2xl bg-civic-50 p-3 text-civic-700">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-950">{siteInfo.portalName}</h2>
            <p className="mt-4 leading-7 text-slate-600">
              Kunri Citizens Portal is proposed as a public-facing digital platform for {siteInfo.townName}. It is designed to provide citizens with information about municipal services, complaint submission, complaint tracking, public notices, news updates and downloadable forms.
            </p>
            <p className="mt-4 leading-7 text-slate-600">
              The portal should be used as an official website only after written approval, final content confirmation and branding approval from the competent authority of Town Committee Kunri.
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-civic-700 p-6 text-white shadow-sm sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-emerald-100">Portal Purpose</p>
            <h2 className="mt-2 text-2xl font-bold">Citizen service and accountability</h2>
            <p className="mt-4 leading-7 text-emerald-50">
              The main purpose is to make public communication easier, reduce manual follow-up, and create a clear record of citizen complaints and official responses.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {quickFacts.map((item) => (
            <PublicCard key={item.title} title={item.title} description={item.description} />
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-slate-950">Main objectives</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {objectives.map((objective) => (
              <div key={objective} className="flex gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-civic-700" />
                <p className="text-sm leading-6 text-slate-700">{objective}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
