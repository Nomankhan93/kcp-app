export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description: string;
}) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {eyebrow ? <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
      </div>
    </section>
  );
}
