import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2, SearchX, ShieldAlert, X } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

const toneClasses: Record<Tone, { box: string; icon: string; title: string; body: string; button: string }> = {
  info: {
    box: 'border-civic-200 bg-civic-50 text-civic-950',
    icon: 'bg-white text-civic-800 ring-civic-100',
    title: 'text-civic-950',
    body: 'text-civic-900',
    button: 'bg-civic-700 text-white hover:bg-civic-800',
  },
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: 'bg-white text-emerald-700 ring-emerald-100',
    title: 'text-emerald-950',
    body: 'text-emerald-900',
    button: 'bg-emerald-700 text-white hover:bg-emerald-800',
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-950',
    icon: 'bg-white text-amber-700 ring-amber-100',
    title: 'text-amber-950',
    body: 'text-amber-900',
    button: 'bg-amber-700 text-white hover:bg-amber-800',
  },
  error: {
    box: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: 'bg-white text-rose-700 ring-rose-100',
    title: 'text-rose-950',
    body: 'text-rose-900',
    button: 'bg-rose-700 text-white hover:bg-rose-800',
  },
  neutral: {
    box: 'border-slate-200 bg-white text-slate-900',
    icon: 'bg-slate-50 text-slate-600 ring-slate-100',
    title: 'text-slate-950',
    body: 'text-slate-600',
    button: 'bg-slate-900 text-white hover:bg-slate-800',
  },
};

function iconForTone(tone: Tone) {
  if (tone === 'success') return CheckCircle2;
  if (tone === 'warning') return ShieldAlert;
  if (tone === 'error') return AlertCircle;
  if (tone === 'neutral') return SearchX;
  return Info;
}

export function LoadingPanel({ message = 'Loading...', compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center rounded-3xl border border-slate-200 bg-white text-slate-600 shadow-sm ${compact ? 'p-4 text-sm' : 'p-6'}`}
    >
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-civic-700" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export function AlertBox({
  tone = 'info',
  title,
  children,
  compact = false,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const Icon = iconForTone(tone);
  const classes = toneClasses[tone];

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-3xl border shadow-sm ${classes.box} ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex gap-3">
        <span className={`mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-2xl ring-1 ${classes.icon}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          {title ? <h3 className={`text-sm font-black sm:text-base ${classes.title}`}>{title}</h3> : null}
          <div className={`text-sm leading-6 ${title ? 'mt-1' : ''} ${classes.body}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function InlineToast({
  tone = 'info',
  message,
  onDismiss,
}: {
  tone?: Tone;
  message: ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = iconForTone(tone);
  const classes = toneClasses[tone];

  return (
    <div role={tone === 'error' ? 'alert' : 'status'} aria-live="polite" className={`rounded-2xl border px-4 py-3 shadow-sm ${classes.box}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
        <div className={`min-w-0 flex-1 text-sm font-semibold leading-6 ${classes.body}`}>{message}</div>
        {onDismiss ? (
          <button type="button" onClick={onDismiss} className="rounded-full p-1 opacity-70 hover:bg-white/70 hover:opacity-100" aria-label="Dismiss message">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 ring-1 ring-slate-100">
        <SearchX className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function PermissionDeniedState({
  title = 'Access denied',
  description = 'Your account does not have permission to open this page.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900 shadow-sm">
      <div className="flex gap-4">
        <span className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white text-rose-700 ring-1 ring-rose-100">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-rose-800">{description}</p>
          {action ? <div className="mt-4 flex flex-wrap gap-2">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'warning',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const Icon = iconForTone(tone);
  const classes = toneClasses[tone];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex gap-4">
          <span className={`inline-flex h-12 w-12 flex-none items-center justify-center rounded-2xl ring-1 ${classes.icon}`}>
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-lg font-black text-slate-950">{title}</h2>
            <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${classes.button}`}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
