import type { ReactNode } from 'react';

export function SectionCard({
  title,
  description,
  children,
  actions,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {(title || description || actions) ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
          <div className="min-w-0">
            {title ? <h2 className="text-lg font-black text-slate-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <dt className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm font-semibold leading-6 text-slate-800">{value}</dd>
    </div>
  );
}

export function ProgressMeter({ value, label }: { value: number; label: string }) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div aria-label={`${label}: ${safeValue}%`}>
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{label}</span>
        <span>{safeValue}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-2 rounded-full bg-civic-700" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}
