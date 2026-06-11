import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { checkCmsAccess, deleteCmsRecord, fetchAdminLeadershipMessages, saveLeadershipMessage } from '../lib/cms';
import type { CmsLeadershipMessageRow } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

export function AdminContentMessages() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<CmsLeadershipMessageRow[]>([]);
  const [editing, setEditing] = useState<CmsLeadershipMessageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void init(); }, []);
  async function init() {
    const access = await checkCmsAccess();
    if (!access.signedIn) { setSessionState('signed-out'); setLoading(false); return; }
    setSessionState('signed-in'); setAllowed(access.allowed);
    if (access.allowed) await loadItems();
    setLoading(false);
  }
  async function loadItems() { setError(''); setItems(await fetchAdminLeadershipMessages()); }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await saveLeadershipMessage(new FormData(event.currentTarget), editing?.id); setMessage(editing ? 'Message updated successfully.' : 'Message created successfully.'); setEditing(null); event.currentTarget.reset(); await loadItems(); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to save leadership message.'); }
    finally { setSaving(false); }
  }
  async function handleDelete(item: CmsLeadershipMessageRow) { if (!confirm(`Delete message: ${item.title}?`)) return; await deleteCmsRecord('cms_leadership_messages', item.id); if (editing?.id === item.id) setEditing(null); await loadItems(); }
  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader eyebrow="Public CMS" title="Manage leadership messages" description="Update MPA and Chairman messages, photos, titles and display order." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[460px_1fr] sm:px-6 lg:px-8">
        {loading ? <p className="text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading...</p> : null}
        {allowed === false ? <AccessDenied /> : null}
        {allowed ? (
          <>
            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><h2 className="text-lg font-bold text-slate-950">{editing ? 'Edit message' : 'Add message'}</h2><p className="text-xs text-slate-500">Published active messages appear on /leadership-messages.</p></div>
                {editing ? <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><Plus className="mr-1 inline h-3 w-3" /> New</button> : null}
              </div>
              <Field label="Message key" name="message_key" defaultValue={editing?.message_key ?? ''} placeholder="mpa or chairman" required />
              <Field label="Eyebrow" name="eyebrow" defaultValue={editing?.eyebrow ?? ''} required />
              <Field label="Title" name="title" defaultValue={editing?.title ?? ''} required />
              <Field label="Full name" name="full_name" defaultValue={editing?.full_name ?? ''} required />
              <Field label="Designation" name="designation" defaultValue={editing?.designation ?? ''} required />
              <TextArea label="Subtitle" name="subtitle" defaultValue={editing?.subtitle ?? ''} rows={3} required />
              <TextArea label="Message text" name="message_text" defaultValue={editing?.message_text ?? ''} rows={8} required />
              <TextArea label="Internal/public note optional" name="note" defaultValue={editing?.note ?? ''} rows={3} />
              <Field label="Image URL optional" name="image_url" defaultValue={editing?.image_url ?? ''} placeholder="/leadership/...jpg" />
              <Field label="Image alt text" name="image_alt" defaultValue={editing?.image_alt ?? ''} />
              <Field label="Display order" name="display_order" type="number" defaultValue={String(editing?.display_order ?? 100)} required />
              <Select label="Image fit" name="image_fit" defaultValue={editing?.image_fit ?? 'cover'} options={[["cover", "Cover"], ["contain", "Contain"]]} />
              <Select label="Status" name="status" defaultValue={editing?.status ?? 'draft'} options={[["draft", "Draft"], ["published", "Published"]]} />
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={editing?.is_active ?? true} className="h-4 w-4 rounded border-slate-300" /> Active</label>
              <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">Photo optional</span><input name="image" type="file" accept="image/*" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" /><input type="hidden" name="existingImagePath" value={editing?.image_path ?? ''} /></label>
              {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}{message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
              <button disabled={saving} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white hover:bg-civic-800 disabled:opacity-70">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save message</button>
              <Link to="/admin/content" className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="mr-2 h-4 w-4" /> Back to CMS</Link>
            </form>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">Leadership Messages</h2><div className="mt-4 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-civic-700">{item.status} • {item.is_active ? 'active' : 'inactive'} • order {item.display_order}</p><h3 className="mt-1 font-bold text-slate-950">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.full_name} — {item.designation}</p><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.subtitle}</p></div><div className="flex gap-2"><button type="button" onClick={() => setEditing(item)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"><Pencil className="mr-1 inline h-3 w-3" /> Edit</button><button type="button" onClick={() => void handleDelete(item)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="mr-1 inline h-3 w-3" /> Delete</button></div></div></div>)}{!items.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No messages yet.</p> : null}</div></div>
          </>
        ) : null}
      </section>
    </>
  );
}

function AccessDenied() { return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 lg:col-span-2"><h2 className="text-xl font-bold">Access denied</h2><p className="mt-2 text-sm">Only admin and staff users can manage content.</p></div>; }
function Field({ label, name, defaultValue, type = 'text', required = false, placeholder = '' }: { label: string; name: string; defaultValue?: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">{label}</span><input name={name} type={type} defaultValue={defaultValue ?? ''} required={required} placeholder={placeholder} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2" /></label>; }
function TextArea({ label, name, defaultValue, required = false, rows = 5 }: { label: string; name: string; defaultValue?: string; required?: boolean; rows?: number }) { return <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">{label}</span><textarea name={name} defaultValue={defaultValue ?? ''} required={required} rows={rows} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2" /></label>; }
function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<[string, string]> }) { return <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">{label}</span><select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
