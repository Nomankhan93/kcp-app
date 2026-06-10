import { Quote } from 'lucide-react';
import type { LeadershipMessage } from '../lib/publicContent';

export function LeadershipMessageCard({ message, reverse = false }: { message: LeadershipMessage; reverse?: boolean }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className={`grid gap-0 lg:grid-cols-[0.9fr_1.1fr] ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div className="bg-slate-100 p-4 sm:p-5">
          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
            <img
              src={message.imageUrl}
              alt={message.imageAlt}
              className={`h-[360px] w-full ${message.imageFit === 'contain' ? 'object-contain' : 'object-cover'} bg-slate-100`}
            />
          </div>
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-civic-700">{message.eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{message.title}</h2>
          <div className="mt-5 rounded-2xl bg-civic-50 p-4 ring-1 ring-civic-100">
            <p className="text-lg font-extrabold text-civic-900">{message.name}</p>
            <p className="mt-1 text-sm font-semibold text-civic-700">{message.designation}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message.subtitle}</p>
          </div>

          <Quote className="mt-7 h-9 w-9 text-civic-700" />
          <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
            {message.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-7 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-100">
            {message.note}
          </div>
        </div>
      </div>
    </article>
  );
}
