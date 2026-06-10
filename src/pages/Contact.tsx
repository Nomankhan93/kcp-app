import { MapPin } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { contactItems, siteInfo } from '../lib/publicContent';

export function Contact() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Office address and contact information"
        description="Official contact details for Town Committee Kunri can be updated here after confirmation from the office."
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold text-slate-950">{siteInfo.townName}</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Citizens may use this portal for online complaint submission and tracking. For urgent field matters, official contact numbers should be confirmed and added by Town Committee Kunri.
            </p>
            <div className="mt-6 space-y-4">
              {contactItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex gap-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <Icon className="mt-0.5 h-5 w-5 flex-none text-civic-700" />
                    <div>
                      <p className="text-sm font-bold text-slate-950">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-100 p-6 shadow-sm sm:p-8">
            <div className="flex h-full min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <MapPin className="h-12 w-12 text-civic-700" />
              <h2 className="mt-4 text-2xl font-bold text-slate-950">Map placeholder</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                Google Map embed or official office location can be added after confirmation of the exact office address.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
