import type { ReactNode } from 'react';

type PublicCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  meta?: string;
  status?: string;
  children?: ReactNode;
};

export function PublicCard({ title, description, icon, meta, status, children }: PublicCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-4">
        {icon ? <div className="inline-flex rounded-2xl bg-civic-50 p-3 text-civic-700">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          {meta ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-civic-700">{meta}</p> : null}
          <h3 className="mt-1 text-lg font-bold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          {status ? (
            <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-100">
              {status}
            </span>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </article>
  );
}
