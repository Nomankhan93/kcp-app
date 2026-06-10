-- Kunri Citizens Portal - Public CMS v1
-- Dynamic notices, news, downloads/forms and leadership messages.
-- Run on Kunri local DB port 55322 or Cloud Supabase SQL Editor.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Role / access helper. user_roles.role is text in this project.
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.is_cms_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('admin', 'chairman', 'staff')
  );
$$;

grant execute on function public.is_cms_staff() to authenticated;

-- -----------------------------------------------------------------------------
-- CMS tables
-- -----------------------------------------------------------------------------
create table if not exists public.cms_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  notice_date date not null default current_date,
  attachment_path text,
  attachment_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_notices_status_date_idx on public.cms_notices (status, notice_date desc);
create index if not exists cms_notices_featured_idx on public.cms_notices (is_featured, notice_date desc);

create table if not exists public.cms_news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  body text,
  image_path text,
  image_url text,
  published_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_featured boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_news_status_published_idx on public.cms_news (status, published_at desc);
create index if not exists cms_news_featured_idx on public.cms_news (is_featured, published_at desc);

create table if not exists public.cms_downloads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null default 'Forms',
  file_path text,
  file_url text,
  file_name text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 100,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_downloads_status_sort_idx on public.cms_downloads (status, sort_order, created_at desc);

create table if not exists public.cms_leadership_messages (
  id uuid primary key default gen_random_uuid(),
  message_key text not null unique,
  eyebrow text not null,
  title text not null,
  full_name text not null,
  designation text not null,
  subtitle text not null,
  message_text text not null,
  note text,
  image_path text,
  image_url text,
  image_alt text,
  image_fit text not null default 'cover' check (image_fit in ('cover', 'contain')),
  display_order integer not null default 100,
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cms_leadership_status_order_idx on public.cms_leadership_messages (status, is_active, display_order);

-- -----------------------------------------------------------------------------
-- Updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_cms_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists cms_news_set_updated_at on public.cms_news;
create trigger cms_news_set_updated_at
before update on public.cms_news
for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_downloads_set_updated_at on public.cms_downloads;
create trigger cms_downloads_set_updated_at
before update on public.cms_downloads
for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_leadership_messages_set_updated_at on public.cms_leadership_messages;
create trigger cms_leadership_messages_set_updated_at
before update on public.cms_leadership_messages
for each row execute function public.set_cms_updated_at();

drop trigger if exists cms_notices_set_updated_at on public.cms_notices;
create trigger cms_notices_set_updated_at
before update on public.cms_notices
for each row execute function public.set_cms_updated_at();
-- -----------------------------------------------------------------------------
-- RLS policies
-- Public can read only published content. Admin/chairman/staff can manage all.
-- -----------------------------------------------------------------------------
alter table public.cms_notices enable row level security;
alter table public.cms_news enable row level security;
alter table public.cms_downloads enable row level security;
alter table public.cms_leadership_messages enable row level security;

drop policy if exists "Public can read published notices" on public.cms_notices;
create policy "Public can read published notices"
  on public.cms_notices
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "CMS staff manage notices" on public.cms_notices;
create policy "CMS staff manage notices"
  on public.cms_notices
  for all
  to authenticated
  using (public.is_cms_staff())
  with check (public.is_cms_staff());

drop policy if exists "Public can read published news" on public.cms_news;
create policy "Public can read published news"
  on public.cms_news
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "CMS staff manage news" on public.cms_news;
create policy "CMS staff manage news"
  on public.cms_news
  for all
  to authenticated
  using (public.is_cms_staff())
  with check (public.is_cms_staff());

drop policy if exists "Public can read published downloads" on public.cms_downloads;
create policy "Public can read published downloads"
  on public.cms_downloads
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists "CMS staff manage downloads" on public.cms_downloads;
create policy "CMS staff manage downloads"
  on public.cms_downloads
  for all
  to authenticated
  using (public.is_cms_staff())
  with check (public.is_cms_staff());

drop policy if exists "Public can read active published leadership messages" on public.cms_leadership_messages;
create policy "Public can read active published leadership messages"
  on public.cms_leadership_messages
  for select
  to anon, authenticated
  using (status = 'published' and is_active = true);

drop policy if exists "CMS staff manage leadership messages" on public.cms_leadership_messages;
create policy "CMS staff manage leadership messages"
  on public.cms_leadership_messages
  for all
  to authenticated
  using (public.is_cms_staff())
  with check (public.is_cms_staff());

-- -----------------------------------------------------------------------------
-- Storage bucket for CMS files/images
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-files',
  'cms-files',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read cms files" on storage.objects;
create policy "Public can read cms files"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'cms-files');

drop policy if exists "CMS staff can upload cms files" on storage.objects;
create policy "CMS staff can upload cms files"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'cms-files' and public.is_cms_staff());

drop policy if exists "CMS staff can update cms files" on storage.objects;
create policy "CMS staff can update cms files"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'cms-files' and public.is_cms_staff())
  with check (bucket_id = 'cms-files' and public.is_cms_staff());

drop policy if exists "CMS staff can delete cms files" on storage.objects;
create policy "CMS staff can delete cms files"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'cms-files' and public.is_cms_staff());

-- -----------------------------------------------------------------------------
-- Seed draft/published starter content. Safe to rerun.
-- -----------------------------------------------------------------------------
insert into public.cms_notices (title, description, notice_date, status, is_featured)
values
  ('Official notice board is ready for approved content', 'Town Committee Kunri can publish public notices, meeting notices, emergency alerts and citizen guidance here after official approval.', current_date, 'published', true),
  ('Citizen complaint categories can be updated', 'Complaint categories, wards and departments can be finalized after approval from Town Committee Kunri administration.', current_date, 'published', false)
on conflict do nothing;

insert into public.cms_news (title, summary, body, published_at, status, is_featured)
values
  ('Kunri Citizens Portal public website structure prepared', 'The portal includes introduction, leadership messages, services, notices, news, downloads, contact and complaint tracking sections.', 'This is a draft update. Replace it with approved Town Committee content before public launch.', now(), 'published', true),
  ('Complaint management workflow proposed', 'Citizens submit complaints, receive tracking numbers, and Town Committee staff can review and update complaint status through admin dashboard.', 'This is a draft update. Replace it with approved Town Committee content before public launch.', now(), 'published', false)
on conflict do nothing;

insert into public.cms_downloads (title, description, category, status, sort_order)
values
  ('Citizen Complaint Form', 'Printable complaint form template for citizens who prefer manual submission at Town Committee office.', 'Complaint Forms', 'published', 10),
  ('Birth Record Inquiry Form', 'Template for birth record inquiry and required document guidance.', 'Certificate Forms', 'published', 20),
  ('Death Record Inquiry Form', 'Template for death record inquiry and required document guidance.', 'Certificate Forms', 'published', 30),
  ('Department Contact Sheet', 'Official department-wise contact list after approval from Town Committee Kunri.', 'Public Information', 'published', 40)
on conflict do nothing;

insert into public.cms_leadership_messages (
  message_key,
  eyebrow,
  title,
  full_name,
  designation,
  subtitle,
  message_text,
  note,
  image_url,
  image_alt,
  image_fit,
  display_order,
  status,
  is_active
)
values
  (
    'mpa',
    'Public Representative Message',
    'Message from the Member Provincial Assembly',
    'Member Provincial Assembly',
    'PS-51 Kunri / Umerkot',
    'Supporting digital access, service monitoring and citizen facilitation for Kunri.',
    'Digital public service systems can help citizens reach municipal offices more easily and help elected representatives monitor public issues more transparently.\n\nThe Kunri Citizens Portal can provide a simple channel for complaints, certificate service requests, public notices, downloads and service information for the residents of Kunri.\n\nThis section can be updated with the approved official message, name, designation and any development priorities shared by the Member Provincial Assembly office.',
    'Draft text. Add approved official name/message only after written confirmation from the MPA office.',
    '/leadership/mpa-ps51-kunri-umerkot.jpg',
    'Member Provincial Assembly PS-51 Kunri Umerkot public message image',
    'contain',
    10,
    'published',
    true
  ),
  (
    'chairman',
    'Chairman Message',
    'Message from the Chairman',
    'Chairman, Town Committee Kunri',
    'Town Committee Kunri',
    'Public service, transparency and timely complaint resolution for Kunri citizens.',
    'Kunri Citizens Portal is proposed as a digital public service platform for Town Committee Kunri. The aim is to make municipal complaint submission, tracking and communication easier for citizens.\n\nThrough this portal, citizens will be able to submit complaints related to sanitation, street lights, drainage, water supply, roads and other municipal services. Each complaint will receive a tracking number for follow-up.\n\nOfficial notices, news updates, public forms and certificate service information can also be published here after approval by the competent authority of Town Committee Kunri.',
    'Draft text. Replace with the Chairman approved official message and name before public launch.',
    '/leadership/chairman-town-committee-kunri.jpg',
    'Chairman Town Committee Kunri official office photo',
    'cover',
    20,
    'published',
    true
  )
on conflict (message_key) do update
set display_order = excluded.display_order,
    is_active = true,
    status = 'published';

-- Verification
select 'cms_notices' as table_name, count(*) as rows from public.cms_notices
union all select 'cms_news', count(*) from public.cms_news
union all select 'cms_downloads', count(*) from public.cms_downloads
union all select 'cms_leadership_messages', count(*) from public.cms_leadership_messages;
