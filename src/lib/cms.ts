import { supabase } from './supabase';
import { downloads, leadershipMessages, newsUpdates, publicNotices } from './publicContent';
import type {
  CmsDownloadRow,
  CmsLeadershipMessageRow,
  CmsNewsRow,
  CmsNoticeRow,
  CmsStatus,
} from './types';
import type { LeadershipMessage, PublicCardItem } from './publicContent';

export type CmsAccess = {
  signedIn: boolean;
  allowed: boolean;
  role: 'admin' | 'staff' | null;
};

export type PublicDownloadItem = PublicCardItem & {
  category?: string;
  fileUrl?: string;
  fileName?: string | null;
};

const CMS_BUCKET = 'cms-files';
const CMS_ADMIN_ROLES = ['admin', 'staff'];

function getPublicStorageUrl(path: string | null | undefined) {
  if (!path) return null;
  const { data } = supabase.storage.from(CMS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function resolveFileUrl(path: string | null | undefined, url: string | null | undefined) {
  return getPublicStorageUrl(path) ?? url ?? undefined;
}

function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export async function checkCmsAccess(): Promise<CmsAccess> {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { signedIn: false, allowed: false, role: null };
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .in('role', CMS_ADMIN_ROLES)
    .limit(1);

  if (error) {
    return { signedIn: true, allowed: false, role: null };
  }

  const role = (data?.[0]?.role ?? null) as CmsAccess['role'];
  return { signedIn: true, allowed: Boolean(role), role };
}

export async function uploadCmsFile(file: File, folder: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const path = `${folder}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(CMS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  return path;
}

export async function fetchPublishedNotices(): Promise<PublicCardItem[]> {
  const { data, error } = await supabase
    .from('cms_notices')
    .select('*')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('notice_date', { ascending: false });

  if (error || !data?.length) return publicNotices;

  return (data as CmsNoticeRow[]).map((notice) => ({
    title: notice.title,
    description: notice.description,
    meta: notice.notice_date ? `Notice date: ${new Date(notice.notice_date).toLocaleDateString()}` : 'Public notice',
    status: notice.is_featured ? 'Featured' : 'Published',
  }));
}

export async function fetchPublishedNews(): Promise<PublicCardItem[]> {
  const { data, error } = await supabase
    .from('cms_news')
    .select('*')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error || !data?.length) return newsUpdates;

  return (data as CmsNewsRow[]).map((news) => ({
    title: news.title,
    description: news.summary,
    meta: news.published_at ? `Published: ${new Date(news.published_at).toLocaleDateString()}` : 'News update',
    status: news.is_featured ? 'Featured' : 'Published',
  }));
}

export async function fetchPublishedDownloads(): Promise<PublicDownloadItem[]> {
  const { data, error } = await supabase
    .from('cms_downloads')
    .select('*')
    .eq('status', 'published')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error || !data?.length) return downloads;

  return (data as CmsDownloadRow[]).map((item) => ({
    title: item.title,
    description: item.description,
    meta: item.category,
    status: item.file_path || item.file_url ? 'Available' : 'File pending',
    category: item.category,
    fileUrl: resolveFileUrl(item.file_path, item.file_url),
    fileName: item.file_name,
  }));
}

export async function fetchPublishedLeadershipMessages(): Promise<LeadershipMessage[]> {
  const { data, error } = await supabase
    .from('cms_leadership_messages')
    .select('*')
    .eq('status', 'published')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error || !data?.length) return leadershipMessages;

  return (data as CmsLeadershipMessageRow[]).map((message) => ({
    id: message.message_key,
    eyebrow: message.eyebrow,
    title: message.title,
    name: message.full_name,
    designation: message.designation,
    subtitle: message.subtitle,
    imageUrl: resolveFileUrl(message.image_path, message.image_url) ?? '/logo.png',
    imageAlt: message.image_alt ?? message.full_name,
    imageFit: message.image_fit,
    paragraphs: splitParagraphs(message.message_text),
    note: message.note ?? '',
  }));
}

export async function fetchAdminNotices() {
  const { data, error } = await supabase.from('cms_notices').select('*').order('notice_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CmsNoticeRow[];
}

export async function saveNotice(formData: FormData, id?: string) {
  const file = formData.get('attachment') as File | null;
  const attachmentPath = file && file.size > 0 ? await uploadCmsFile(file, 'notices') : String(formData.get('existingAttachmentPath') || '') || null;

  const payload = {
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    notice_date: String(formData.get('notice_date') || todayISODate()),
    attachment_path: attachmentPath,
    status: String(formData.get('status') || 'draft') as CmsStatus,
    is_featured: formData.get('is_featured') === 'on',
  };

  if (!payload.title || !payload.description) throw new Error('Title and description are required.');

  const query = id ? supabase.from('cms_notices').update(payload).eq('id', id) : supabase.from('cms_notices').insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function fetchAdminNews() {
  const { data, error } = await supabase.from('cms_news').select('*').order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CmsNewsRow[];
}

export async function saveNews(formData: FormData, id?: string) {
  const file = formData.get('image') as File | null;
  const imagePath = file && file.size > 0 ? await uploadCmsFile(file, 'news') : String(formData.get('existingImagePath') || '') || null;

  const payload = {
    title: String(formData.get('title') || '').trim(),
    summary: String(formData.get('summary') || '').trim(),
    body: String(formData.get('body') || '').trim() || null,
    image_path: imagePath,
    published_at: String(formData.get('published_at') || new Date().toISOString()),
    status: String(formData.get('status') || 'draft') as CmsStatus,
    is_featured: formData.get('is_featured') === 'on',
  };

  if (!payload.title || !payload.summary) throw new Error('Title and short summary are required.');

  const query = id ? supabase.from('cms_news').update(payload).eq('id', id) : supabase.from('cms_news').insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function fetchAdminDownloads() {
  const { data, error } = await supabase.from('cms_downloads').select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CmsDownloadRow[];
}

export async function saveDownload(formData: FormData, id?: string) {
  const file = formData.get('file') as File | null;
  const filePath = file && file.size > 0 ? await uploadCmsFile(file, 'downloads') : String(formData.get('existingFilePath') || '') || null;

  const payload = {
    title: String(formData.get('title') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    category: String(formData.get('category') || 'Forms').trim(),
    file_path: filePath,
    file_name: file && file.size > 0 ? file.name : String(formData.get('existingFileName') || '') || null,
    status: String(formData.get('status') || 'draft') as CmsStatus,
    sort_order: Number(formData.get('sort_order') || 100),
  };

  if (!payload.title || !payload.description) throw new Error('Title and description are required.');

  const query = id ? supabase.from('cms_downloads').update(payload).eq('id', id) : supabase.from('cms_downloads').insert(payload);
  const { error } = await query;
  if (error) throw error;
}

export async function fetchAdminLeadershipMessages() {
  const { data, error } = await supabase.from('cms_leadership_messages').select('*').order('display_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CmsLeadershipMessageRow[];
}

export async function saveLeadershipMessage(formData: FormData, id?: string) {
  const file = formData.get('image') as File | null;
  const imagePath = file && file.size > 0 ? await uploadCmsFile(file, 'leadership') : String(formData.get('existingImagePath') || '') || null;

  const payload = {
    message_key: String(formData.get('message_key') || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    eyebrow: String(formData.get('eyebrow') || '').trim(),
    title: String(formData.get('title') || '').trim(),
    full_name: String(formData.get('full_name') || '').trim(),
    designation: String(formData.get('designation') || '').trim(),
    subtitle: String(formData.get('subtitle') || '').trim(),
    message_text: String(formData.get('message_text') || '').trim(),
    note: String(formData.get('note') || '').trim() || null,
    image_path: imagePath,
    image_url: String(formData.get('image_url') || '').trim() || null,
    image_alt: String(formData.get('image_alt') || '').trim() || null,
    image_fit: String(formData.get('image_fit') || 'cover') as 'cover' | 'contain',
    display_order: Number(formData.get('display_order') || 100),
    status: String(formData.get('status') || 'draft') as CmsStatus,
    is_active: formData.get('is_active') === 'on',
  };

  if (!payload.message_key || !payload.title || !payload.full_name || !payload.message_text) {
    throw new Error('Message key, title, name and message text are required.');
  }

  const query = id
    ? supabase.from('cms_leadership_messages').update(payload).eq('id', id)
    : supabase.from('cms_leadership_messages').insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function deleteCmsRecord(table: 'cms_notices' | 'cms_news' | 'cms_downloads' | 'cms_leadership_messages', id: string) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
