# Security Acceptance Checklist

Before launch, verify these items.

## Environment

- [ ] Vercel has only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] No service role key exists in frontend code or `.env`
- [ ] `.env` is ignored by Git
- [ ] Cloud Supabase project is separate from JAS app

## Roles

- [ ] Admin can access all admin areas
- [ ] Chairman can view dashboards/reports
- [ ] Staff can manage complaints/content as intended
- [ ] Certificate officer can process certificates
- [ ] General Councilor can only access own ward certificate applications
- [ ] General Councilor cannot access full admin dashboard

## Public privacy

- [ ] Complaint tracking requires tracking number + mobile
- [ ] Certificate tracking requires tracking number + mobile
- [ ] CNIC is not exposed on public tracking pages
- [ ] Applicant supporting documents are not publicly listed
- [ ] Issued certificate link appears only after successful tracking

## Storage

- [ ] `complaint-photos` bucket is private
- [ ] `certificate-documents` bucket is private
- [ ] `cms-files` bucket is public
- [ ] Upload limits and mime types are set

## Operational

- [ ] 10 wards exist
- [ ] Each active councilor is assigned to only one ward
- [ ] Public notices/news/downloads can be managed from CMS
- [ ] Reports and CSV export work
- [ ] Vercel direct URLs do not 404 after refresh
