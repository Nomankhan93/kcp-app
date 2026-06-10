# Public CMS v1

This patch adds admin-managed public website content for Kunri Citizens Portal.

## New admin routes

- `/admin/content`
- `/admin/content/notices`
- `/admin/content/news`
- `/admin/content/downloads`
- `/admin/content/messages`

## Public pages now read CMS content

- `/notices`
- `/news`
- `/downloads`
- `/leadership-messages`
- `/chairman-message`

If CMS tables are empty or unavailable, pages continue to show the existing static fallback content.

## SQL

Run:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/public-cms-v1.sql
```

For Cloud Supabase, run the same SQL in SQL Editor. Make sure admin/chairman/staff users already have roles in `public.user_roles`.

## Storage

A public storage bucket is created:

- `cms-files`

Used for notice attachments, news images, downloadable forms, and leadership photos.

## Permissions

- Public users can read only `published` content.
- `admin`, `chairman`, and `staff` can create, update, delete, upload and publish content.
- `general_councilor` does not get CMS access.
