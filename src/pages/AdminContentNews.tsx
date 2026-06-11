import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { checkCmsAccess, deleteCmsRecord, fetchAdminNews, saveNews } from '../lib/cms';
import type { CmsNewsRow } from '../lib/types';

type SessionState = 'checking' | 'signed-out' | 'signed-in';

export function AdminContentNews() {
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [items, setItems] = useState<CmsNewsRow[]>([]);
  const [editing, setEditing] = useState<CmsNewsRow | null>(null);
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
  async function loadItems() { setError(''); setItems(await fetchAdminNews()); }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await saveNews(new FormData(event.currentTarget), editing?.id); setMessage(editing ? 'News updated successfully.' : 'News created successfully.'); setEditing(null); event.currentTarget.reset(); await loadItems(); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to save news.'); }
    finally { setSaving(false); }
  }
  async function handleDelete(item: CmsNewsRow) {
    if (!confirm(`Delete news: ${item.title}?`)) return;
    await deleteCmsRecord('cms_news', item.id); if (editing?.id === item.id) setEditing(null); await loadItems();
  }
  if (sessionState === 'signed-out') return <Navigate to="/admin/login" replace />;

  return (
    <>
      <PageHeader eyebrow="Public CMS" title="Manage news / updates" description="Create, update and publish municipal news and public service updates." />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[420px_1fr] sm:px-6 lg:px-8">
        {loading ? <p className="text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading...</p> : null}
        {allowed === false ? <AccessDenied /> : null}
        {allowed ? (
          <>
            <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div><h2 className="text-lg font-bold text-slate-950">{editing ? 'Edit news' : 'Add news'}</h2><p className="text-xs text-slate-500">Published updates appear on /news.</p></div>
                {editing ? <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"><Plus className="mr-1 inline h-3 w-3" /> New</button> : null}
              </div>
              <Field label="Title" name="title" defaultValue={editing?.title} required />
              <TextArea label="Short summary" name="summary" defaultValue={editing?.summary} required rows={3} />
              <TextArea label="Full details optional" name="body" defaultValue={editing?.body ?? ''} rows={6} />
              <Field label="Published date/time" name="published_at" type="datetime-local" defaultValue={editing ? editing.published_at.slice(0, 16) : new Date().toISOString().slice(0, 16)} required />
              <Select label="Status" name="status" defaultValue={editing?.status ?? 'draft'} options={[["draft", "Draft"], ["published", "Published"]]} />
              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured ?? false} className="h-4 w-4 rounded border-slate-300" /> Featured news</label>
              <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">Image optional</span><input name="image" type="file" accept="image/*" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" /><input type="hidden" name="existingImagePath" value={editing?.image_path ?? ''} /></label>
              {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}{message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
              <button disabled={saving} className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-civic-700 px-5 py-3 text-sm font-bold text-white hover:bg-civic-800 disabled:opacity-70">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save news</button>
              <Link to="/admin/content" className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="mr-2 h-4 w-4" /> Back to CMS</Link>
            </form>
            <List items={items} onEdit={setEditing} onDelete={(item) => void handleDelete(item)} />
          </>
        ) : null}
      </section>
    </>
  );
}

function List({ items, onEdit, onDelete }: { items: CmsNewsRow[]; onEdit: (item: CmsNewsRow) => void; onDelete: (item: CmsNewsRow) => void }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-slate-950">News / Updates</h2><div className="mt-4 grid gap-3">{items.map((item) => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-civic-700">{item.status} • {new Date(item.published_at).toLocaleDateString()}</p><h3 className="mt-1 font-bold text-slate-950">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.summary}</p></div><div className="flex gap-2"><button type="button" onClick={() => onEdit(item)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"><Pencil className="mr-1 inline h-3 w-3" /> Edit</button><button type="button" onClick={() => onDelete(item)} className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="mr-1 inline h-3 w-3" /> Delete</button></div></div></div>)}{!items.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No news yet.</p> : null}</div></div>;
}
function AccessDenied() { return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800 lg:col-span-2"><h2 className="text-xl font-bold">Access denied</h2><p className="mt-2 text-sm">Only admin and staff users can manage content.</p></div>; }
function Field({ label, name, defaultValue, type = 'text', required = false }: { label: string; name: string; defaultValue?: string; type?: string; required?: boolean }) { return <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">{label}</span><input name={name} type={type} defaultValue={defaultValue ?? ''} required={required} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2" /></label>; }
function TextArea({ label, name, defaultValue, required = false, rows = 5 }: { label: string; name: string; defaultValue?: string; required?: boolean; rows?: number }) { return <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">{label}</span><textarea name={name} defaultValue={defaultValue ?? ''} required={required} rows={rows} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2" /></label>; }
function Select({ label, name, defaultValue, options }: { label: string; name: string; defaultValue: string; options: Array<[string, string]> }) { return <label className="mt-4 block"><span className="text-sm font-semibold text-slate-700">{label}</span><select name={name} defaultValue={defaultValue} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-civic-600 transition focus:ring-2">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
