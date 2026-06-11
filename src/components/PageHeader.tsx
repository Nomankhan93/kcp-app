import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-slate-100 bg-gradient-to-br from-white via-white to-civic-50/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">{eyebrow}</p> : null}
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
          </div>
          {children ? <div className="flex flex-wrap gap-2 lg:justify-end">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
