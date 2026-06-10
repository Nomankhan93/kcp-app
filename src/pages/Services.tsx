import { PageHeader } from '../components/PageHeader';
import { departments } from '../lib/publicContent';

export function Services() {
  return (
    <>
      <PageHeader
        eyebrow="Departments & Services"
        title="Municipal departments and citizen services"
        description="A public overview of proposed service areas and department responsibilities for Town Committee Kunri. Final department names can be updated after approval."
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => {
            const Icon = department.icon;
            return (
              <article key={department.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="inline-flex rounded-2xl bg-civic-50 p-3 text-civic-700">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-950">{department.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{department.description}</p>
                <ul className="mt-5 space-y-2">
                  {department.responsibilities.map((item) => (
                    <li key={item} className="rounded-2xl bg-slate-50 px-4 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
