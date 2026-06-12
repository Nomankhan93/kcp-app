# Kunri Citizens Portal

**Kunri Citizens Portal (KCP)** is a digital citizen service platform for **Town Committee Kunri** under the supervision of the **Chairman Town Committee Kunri**.

The portal provides public website pages, citizen complaint services, birth/marriage/death certificate applications, ward-based General Councilor verification, Town Committee staff dashboards, Chairman executive monitoring, public CMS content management, citizen login/profile features, reports, role-based access control, seed/recovery SQL, and production security hardening.

---

## 1. Project Title

**Kunri Citizens Portal**  
**Town Committee Kunri – Digital Citizen Services Platform**

---

## 2. Short Overview

Kunri Citizens Portal is built to modernize municipal public services for the citizens of Kunri. It allows citizens to submit complaints, track complaint status, apply for certificates, track certificate applications, create citizen accounts, manage profiles, view private records, respond to correction requests, and receive in-app status updates.

The portal also provides operational dashboards for Town Committee staff, ward General Councilors, Certificate Officers, Admin users, and Chairman-level monitoring.

The current application is suitable for internal demonstration and controlled rollout preparation. Before final public launch, official Town Committee approvals, final live credentials, official content, and final acceptance testing should be completed.

---

## 3. Purpose and Objectives

The purpose of this project is to create a transparent, organized, and citizen-friendly digital platform for Town Committee Kunri.

### Main objectives

- Provide online access to municipal services.
- Reduce repeated office visits and manual follow-ups.
- Digitize complaint intake, tracking, assignment, resolution, and reporting.
- Digitize birth, marriage, and death certificate application workflow.
- Assign certificate verification responsibility to ward General Councilors.
- Keep General Councilor access limited to assigned ward verification only.
- Provide Chairman-level monitoring, reports, SLA visibility, and ward/councilor performance insights.
- Allow staff to manage public notices, news, downloads, and leadership messages.
- Maintain structured records with tracking numbers, status history, remarks, and document uploads.
- Improve accountability through strict role-based access control and server-side security policies.

---

## 4. Key Users and Roles

| Role | Purpose | Access Level |
|---|---|---|
| `citizen` | Public user / resident | Signup, signin, profile, submit complaints, apply certificates, track records, view linked private records |
| `admin` | System administrator | Full system control including users, roles, CMS, complaints, certificates, reports, and ward assignments |
| `chairman` | Chairman Town Committee Kunri | Read-only monitoring, executive dashboards, reports, performance visibility, SLA/bottleneck overview |
| `staff` | Town Committee staff | Complaint operations, CMS operations, assigned administrative workflows |
| `certificate_officer` | Certificate processing officer | Final certificate processing, certificate number, certificate upload, ready/delivered status |
| `general_councilor` | Ward General Councilor | Limited certificate verification access for assigned ward only |

### Important access rule

A **General Councilor is not a full admin**.

Each General Councilor has only the `general_councilor` role and verifies only certificate applications from the assigned ward. The current workflow supports **10 wards**.

---

## 5. Features Built

### Public website / citizen-facing portal

Built public pages include:

- Home page
- Town Committee Kunri introduction
- Chairman message
- Leadership messages with MPA/public representative and Chairman content
- Services page
- Notices page
- News / updates page
- Downloads / forms page
- Contact page
- Privacy Policy page
- Clean header logo and navigation
- Favicon and PWA icon assets

### Citizen account system

Built citizen account features:

- Citizen signup and signin
- Citizen private dashboard
- Citizen profile completion
- Profile completion percentage
- Link old complaint/certificate records using tracking number and mobile
- Private complaint detail pages
- Private certificate detail pages
- Citizen notifications page
- Need-correction response flow
- Correction document upload for certificate applications

### Complaint system

Built complaint features:

- Public complaint submission
- Complaint tracking with tracking number and mobile
- Complaint categories
- Ward / area / mohalla fields
- Optional photo upload
- Tracking number generation
- Complaint status timeline
- Admin/staff complaint dashboard
- Complaint filters and search
- Staff/department assignment
- Public remarks and internal remarks
- Resolution proof upload
- Complaint reports and CSV export
- Fail-closed admin complaint mutation behavior after hardening

### Certificate system

Built certificate features:

- Birth certificate application
- Marriage certificate application
- Death certificate application
- Certificate tracking
- Certificate status timeline
- Required information and document upload support
- Ward-based General Councilor verification
- Need Correction / correction response flow
- Town Committee final processing
- Certificate number entry
- Prepared certificate PDF/image upload
- Ready for collection / delivered status
- Citizen private certificate detail page
- Certificate final processing dashboard
- Private issued-certificate access through verified tracking/mobile flow and signed URL generation

### Ward General Councilor workflow

Built councilor workflow:

- 10 ward setup
- `general_councilor` role
- Councilor dashboard
- Councilor sees only assigned ward certificate applications
- Councilor can verify, reject, or mark need correction
- Councilor actions are intended to go through controlled RPC workflow only
- Councilor cannot directly update office-only certificate fields
- Councilor remarks are required
- Councilor verification history is saved
- Inactive councilors can be disabled without deleting history

### Admin and staff management

Built admin/staff features:

- `/admin/users` role management
- `/admin/ward-councilors` ward councilor assignment
- Admin-only user and ward management
- Staff and role management
- CMS management
- Complaint management
- Certificate management
- Reports and monitoring tools
- Confirmation dialogs for sensitive role, ward, complaint, and certificate actions

### Public CMS

Built CMS features:

- Public notices management
- News / updates management
- Downloads / forms management
- Leadership messages management
- CMS file uploads through Supabase Storage
- Public pages load published CMS content

### Security and production readiness

Built security/production features:

- Canonical role helper SQL
- Admin-only role and ward management
- Chairman monitoring/read-only access direction
- Councilor certificate update hardening
- Private certificate file access hardening
- Public form honeypot anti-spam fields
- Privacy Policy page
- Vercel deployment configuration
- SPA route rewrites
- Static asset cache headers
- Basic security headers
- Supabase storage bucket setup
- Supabase security hardening SQL
- Supabase Security Advisor fix SQL
- Canonical migration chain for future clean setup
- Seed and recovery SQL for wards, councilors, admin/chairman roles, and verification
- Route-based lazy loading / code splitting
- `.env.example`
- `.env.production.example`

---

## 6. Recent Patch History

| Patch | Status | Purpose |
|---|---:|---|
| Patch 1 — KCP RLS & Certificate Security Hardening v2 | Completed | Harden certificate RLS, remove broad councilor direct update, private issued-certificate access, fail-closed admin complaint mutation behavior |
| Patch 2 — KCP Canonical Role Helpers v1 | Completed | Lock final role helper behavior across local/cloud; admin full control, chairman read-only monitoring, councilor ward-only verification |
| Patch 3 — KCP Seed & Recovery SQL v1 | Completed | Add seed/recovery SQL for 10 wards, complaint categories, ward councilors, admin/chairman roles, and verification |
| Patch 4 — KCP Canonical Migration Chain v1 | Completed | Add ordered `supabase/migrations` chain for clean future database setup and reduced SQL order confusion |
| Patch 5 — KCP Role-Based Portal Login v1 | Completed | Add `/staff/login`, redirect staff users by role, clean public header login links |
| Patch 6 — KCP UI Safety & Confirmation v1 | Completed | Add confirmation dialogs, success/error feedback, permission denied state, and empty-state improvements |
| Patch 7 — Chairman Executive Dashboard v2 | Completed | Add ward performance, councilor pending verification, SLA buckets, bottleneck alerts, recent activity, and filters |

---

## 7. Citizen Workflow

### Public citizen flow

1. Citizen visits the public portal.
2. Citizen can submit a complaint without login.
3. Citizen can apply for birth, marriage, or death certificate.
4. Citizen receives a tracking number.
5. Citizen tracks record status using tracking number and mobile number.

### Logged-in citizen flow

1. Citizen signs up or signs in from `/citizen/login`.
2. Citizen completes profile at `/citizen/profile`.
3. Citizen views private dashboard at `/citizen/dashboard`.
4. Citizen links old records using tracking number and mobile.
5. Citizen views complaint details at `/citizen/complaints/:id`.
6. Citizen views certificate details at `/citizen/certificates/:id`.
7. Citizen receives in-app notifications at `/citizen/notifications`.
8. If an application needs correction, citizen can respond and upload correction documents.

---

## 8. Complaint Workflow

### Citizen complaint submission

Route:

```text
/submit
```

Citizen submits:

- Name
- Mobile number
- CNIC optional
- Ward / area
- Mohalla
- Complaint category
- Complaint details
- Optional photo upload

The system generates a tracking number, for example:

```text
KCP-2026-000001
```

### Complaint tracking

Route:

```text
/track
```

Citizen tracks status using:

- Tracking number
- Mobile number

Complaint statuses include:

- Submitted
- Received
- In Progress
- Resolved
- Rejected
- Not Related

### Admin/staff complaint handling

Routes:

```text
/admin
/admin/complaints/:id
```

Admin/staff can:

- View complaints
- Search complaints
- Filter by status, category, area/ward, and date
- Assign staff or department
- Update status through controlled backend workflow
- Add public remarks
- Add internal notes
- Upload resolution proof
- Maintain status history

Sensitive complaint actions include confirmation and feedback UI.

---

## 9. Certificate Workflow

### Certificate application

Route:

```text
/certificates/apply
```

Citizens can apply for:

- Birth Certificate
- Marriage Certificate
- Death Certificate

The system generates a certificate tracking number, for example:

```text
KCP-CERT-2026-000001
```

### Certificate tracking

Route:

```text
/certificates/track
```

Citizen tracks application using:

- Tracking number
- Mobile number

Issued certificates should remain private in storage. Public access should be through a verified tracking/mobile flow and signed URL generation, not direct anonymous bucket access.

### Certificate statuses

Certificate workflow supports statuses such as:

- Submitted
- Councilor Review
- Councilor Verified
- Councilor Rejected
- Under Office Processing
- Need Correction / More Info
- Certificate Uploaded
- Ready for Collection
- Delivered
- Rejected

### Final processing

Routes:

```text
/admin/certificates
/admin/certificates/:id
/admin/certificates/final-processing
```

Town Committee staff or Certificate Officer can:

- Review councilor-verified applications
- Check documents
- Add certificate number
- Upload prepared certificate PDF/image
- Update delivery status
- Add final remarks

Sensitive certificate actions such as reject and delivered include confirmation before saving.

---

## 10. Ward General Councilor Workflow

Kunri Citizens Portal includes a ward-based certificate verification system.

### Ward model

- Total wards: **10**
- Ward labels: `Ward 01` to `Ward 10`
- Each ward can be assigned one active General Councilor login user.
- Inactive councilors can be disabled without deleting historical records.

### Councilor role

Role:

```text
general_councilor
```

### Councilor routes

```text
/councilor/certificates
/councilor/certificates/:id
```

### Councilor permissions

A General Councilor can:

- Login to councilor dashboard.
- View certificate applications from assigned ward only.
- Open application details.
- Review submitted information and documents.
- Mark application as verified, rejected, or need correction through controlled review workflow.
- Add verification remarks.

A General Councilor cannot:

- Access full admin dashboard.
- Manage users.
- Manage roles.
- Manage all wards.
- Upload final certificate.
- Process certificates after verification.
- Update office-only certificate fields such as certificate number, issued certificate path, town remarks, delivered status, or final upload fields.

---

## 11. Admin / Staff Workflow

### Admin dashboard

Route:

```text
/admin
```

Admin/staff dashboard provides access to complaint management, certificate management, reports, CMS, and management links depending on role.

### Staff portal login

Route:

```text
/staff/login
```

The staff portal redirects authenticated internal users by role:

| Role | Redirect |
|---|---|
| `admin` | `/admin` |
| `chairman` | `/admin/chairman-dashboard` |
| `staff` | `/admin` |
| `certificate_officer` | `/admin/certificates/final-processing` |
| `general_councilor` | `/councilor/certificates` |

The old `/admin/login` route redirects to `/staff/login`.

The public header should show clean access options:

- Citizen Login
- Staff Portal

### User role management

Route:

```text
/admin/users
```

This page is **admin-only**.

Admin can assign roles:

- `admin`
- `chairman`
- `staff`
- `certificate_officer`
- `general_councilor`

Role changes require confirmation before saving.

### Ward councilor management

Route:

```text
/admin/ward-councilors
```

This page is **admin-only**.

Admin can:

- Assign Ward 01 to Ward 10 to councilor users.
- Update councilor name.
- Update mobile number.
- Enable or disable a councilor assignment.
- Change active councilor without deleting historical records.

Ward reassignment requires confirmation before saving.

### CMS management

Routes:

```text
/admin/content
/admin/content/notices
/admin/content/news
/admin/content/downloads
/admin/content/messages
```

Authorized CMS staff can manage:

- Notices
- News / updates
- Downloads / forms
- Leadership messages

---

## 12. Chairman Monitoring Workflow

Chairman access is designed for read-only monitoring and reporting.

Routes:

```text
/admin/chairman-dashboard
/admin/reports
```

Chairman Executive Dashboard v2 includes:

- Overall KPIs
- Ward-wise performance
- Councilor-wise pending verification
- Certificate type breakdown
- Delayed applications visibility
- SLA buckets:
  - 0–2 days
  - 3–5 days
  - 6–10 days
  - 10+ days
- Bottleneck alerts
- Recent activity feed
- Date filter
- Ward filter
- Certificate type filter
- Search and reset filters
- Read-only monitoring flow

Chairman can monitor:

- Total complaints
- Pending complaints
- In-progress complaints
- Resolved complaints
- High priority issues
- Department-wise performance
- Ward-wise issue summary
- Long pending complaints
- Daily, weekly, monthly, and all-time reports
- Certificate application progress
- Ward/councilor responsibility trends
- Delayed and bottleneck cases

### Chairman access policy

Chairman is not intended to manage users or ward assignments.

Final access model:

| Role | Intended Access |
|---|---|
| `admin` | Full control |
| `chairman` | Monitoring, dashboards, reports, read-only executive view |
| `staff` | Operational complaint/CMS workflows |
| `certificate_officer` | Certificate final processing |
| `general_councilor` | Own ward certificate verification only |
| `citizen` | Own profile and linked records |

---

## 13. Tech Stack Detected from Project Files

The stack below is detected from project files and previous analysis of the uploaded project ZIP.

| Area | Technology |
|---|---|
| Frontend | React `19.1.1` |
| Build tool | Vite `7.2.0` |
| Language | TypeScript `5.9.3` |
| Routing | React Router DOM `7.9.5` |
| Backend / BaaS | Supabase |
| Database | PostgreSQL through Supabase |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Edge Functions | Supabase Edge Functions for private issued-certificate signed URL flow |
| Icons | `lucide-react` |
| Styling | Tailwind CSS `3.4.17` |
| Deployment config | Vercel |
| Local Supabase config | `supabase/config.toml` |

---

## 14. Folder Structure

```text
kunri-citizens-portal/
├── public/
│   ├── favicon.ico
│   ├── logo.png
│   ├── logo-horizontal.png
│   ├── site.webmanifest
│   ├── robots.txt
│   └── sitemap.xml
│
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   │
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── PageHeader.tsx
│   │   ├── PublicCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SetupNotice.tsx
│   │   └── ui/
│   │       └── Feedback.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── complaints.ts
│   │   ├── adminComplaints.ts
│   │   ├── certificates.ts
│   │   ├── citizenAuth.ts
│   │   ├── cms.ts
│   │   ├── userManagement.ts
│   │   ├── constants.ts
│   │   └── types.ts
│   │
│   └── pages/
│       ├── Home.tsx
│       ├── SubmitComplaint.tsx
│       ├── TrackComplaint.tsx
│       ├── CertificateApply.tsx
│       ├── CertificateTrack.tsx
│       ├── CitizenLogin.tsx
│       ├── CitizenDashboard.tsx
│       ├── CitizenProfile.tsx
│       ├── StaffLogin.tsx
│       ├── AdminDashboard.tsx
│       ├── ChairmanDashboard.tsx
│       ├── CouncilorCertificates.tsx
│       └── ...
│
├── supabase/
│   ├── config.toml
│   ├── schema.sql
│   ├── phase1-v2.sql
│   ├── admin-dashboard-v2.sql
│   ├── certificates-v1.sql
│   ├── certificate-ward-verification-v1.sql
│   ├── certificate-final-processing-v2.sql
│   ├── public-cms-v1.sql
│   ├── staff-ward-management-v1.sql
│   ├── production-readiness-v1.sql
│   ├── final-qa-security-hardening-v1.sql
│   ├── security-advisor-fix-v1.sql
│   ├── admin-only-role-management-fix-v1.sql
│   ├── rls-certificate-security-hardening-v2.sql
│   ├── canonical-role-helpers-v1.sql
│   │
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_complaints.sql
│   │   ├── 003_certificates.sql
│   │   ├── 004_councilor_verification.sql
│   │   ├── 005_cms.sql
│   │   ├── 006_citizen_auth_profile.sql
│   │   └── 007_security_hardening.sql
│   │
│   ├── seeds/
│   │   ├── 001_seed_wards.sql
│   │   ├── 002_seed_complaint_categories.sql
│   │   ├── 003_seed_ward_councilors_template.sql
│   │   ├── 004_seed_admin_chairman_template.sql
│   │   └── 005_verify_roles_and_wards.sql
│   │
│   └── functions/
│       └── issued-certificate-download-url/
│           └── index.ts
│
├── docs/
├── .env.example
├── .env.production.example
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── vercel.json
└── README.md
```

---

## 15. Environment Variables

The frontend uses Supabase URL and anon/publishable key only.

### Local `.env`

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Example:

```env
VITE_SUPABASE_URL=http://127.0.0.1:55321
VITE_SUPABASE_ANON_KEY=PASTE_LOCAL_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

### Production `.env`

Use `.env.production.example` for Vercel:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

### Supabase Edge Function secret

The issued-certificate download Edge Function requires a service role key as a Supabase function secret, not as frontend environment variable.

Set it in Supabase secrets for the Edge Function environment:

```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### Important security rule

Never place Supabase `service_role` keys or secret backend keys in frontend environment variables, Vite variables, GitHub, public ZIPs, or client-side code.

---

## 16. Local Setup Instructions

### 1. Install dependencies

```bash
cd ~/projects/kunri-citizens-portal
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Update `.env` with your local Supabase values.

### 3. Start local Supabase

This project is configured to use a separate local Supabase backend.

Recommended local ports from `supabase/config.toml`:

```text
API:    http://127.0.0.1:55321
DB:     127.0.0.1:55322
Studio: http://127.0.0.1:55323
```

Start Supabase:

```bash
npx supabase start
npx supabase status
```

### 4. Run SQL files

For an existing database, apply the patch SQL files in the documented patch order.

For a clean/fresh database, use the canonical migration chain under:

```text
supabase/migrations/
```

### 5. Start development server

```bash
npm run dev
```

Default script starts Vite on port `3000`.

To run on port `3001`:

```bash
npm run dev -- --port 3001
```

---

## 17. Supabase / Database Setup Notes

### Existing database patch order

For an existing local/cloud database, run the main project SQL files and later security patches in order. The final hardening patches should be applied after the older SQL files.

Recommended order for existing DB setup:

```text
1.  supabase/schema.sql
2.  supabase/phase1-v2.sql
3.  supabase/admin-dashboard-v2.sql
4.  supabase/certificates-v1.sql
5.  supabase/certificate-ward-verification-v1.sql
6.  supabase/certificate-final-processing-v2.sql
7.  supabase/public-cms-v1.sql
8.  supabase/staff-ward-management-v1.sql
9.  supabase/production-readiness-v1.sql
10. supabase/final-qa-security-hardening-v1.sql
11. supabase/security-advisor-fix-v1.sql
12. supabase/admin-only-role-management-fix-v1.sql
13. supabase/rls-certificate-security-hardening-v2.sql
14. supabase/canonical-role-helpers-v1.sql
```

### Fresh database canonical migration order

For a clean rebuild / future setup, use:

```text
1. supabase/migrations/001_initial_schema.sql
2. supabase/migrations/002_complaints.sql
3. supabase/migrations/003_certificates.sql
4. supabase/migrations/004_councilor_verification.sql
5. supabase/migrations/005_cms.sql
6. supabase/migrations/006_citizen_auth_profile.sql
7. supabase/migrations/007_security_hardening.sql
```

Example local command:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/migrations/001_initial_schema.sql
```

Repeat for all migration files in order.

### Seed and recovery SQL

Seed/recovery files are stored under:

```text
supabase/seeds/
```

Recommended seed order:

```text
1. supabase/seeds/001_seed_wards.sql
2. supabase/seeds/002_seed_complaint_categories.sql
3. Edit + run supabase/seeds/003_seed_ward_councilors_template.sql
4. Edit + run supabase/seeds/004_seed_admin_chairman_template.sql
5. supabase/seeds/005_verify_roles_and_wards.sql
```

Template files must be edited with real Supabase Auth user UUIDs before running.

### First admin user

After creating the first Auth user in Supabase, assign the `admin` role using SQL or the seed template.

Example:

```sql
insert into public.user_roles (user_id, role)
values ('PASTE_AUTH_USER_UUID'::uuid, 'admin')
on conflict do nothing;
```

After the first admin is created, use:

```text
/admin/users
```

to manage additional roles.

### Storage buckets

The project uses Supabase Storage buckets such as:

| Bucket | Purpose |
|---|---|
| `complaint-photos` | Complaint photo uploads and resolution proof |
| `certificate-documents` | Certificate application documents, corrections, and issued certificates |
| `cms-files` | Public CMS files such as forms, images, and downloadable documents |

Certificate files should remain private. Issued certificate download should go through verified access and signed URL generation.

### Supabase Auth recommendations

For production:

- Enable email confirmation if required by Town Committee policy.
- Enable leaked password protection in Supabase Dashboard.
- Use strong admin passwords.
- Do not share admin accounts between staff.
- Keep service role keys out of frontend code.
- Review all Auth users before official launch.

---

## 18. Available Scripts

Detected from `package.json`.

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite --host 0.0.0.0 --port 3000` | Start local development server |
| `build` | `tsc -b && vite build` | TypeScript build and Vite production build |
| `preview` | `vite preview --host 0.0.0.0 --port 4173` | Preview production build locally |
| `typecheck` | `tsc -b --pretty false` | Run TypeScript type checking |
| `check` | `npm run typecheck && npm run build` | Run full local verification |

Recommended before commit/deploy:

```bash
npm run check
```

---

## 19. Deployment Notes

### Vercel

`vercel.json` is included and configures:

- Vite framework
- Build command: `npm run build`
- Output directory: `dist`
- SPA route rewrite to `index.html`
- Asset cache headers
- Basic security headers

### Vercel deployment steps

1. Push repository to GitHub.
2. Import repository in Vercel.
3. Add environment variables:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

4. Build command:

```bash
npm run build
```

5. Output directory:

```text
dist
```

### Supabase Edge Function deployment

Deploy the issued-certificate private download function:

```bash
npx supabase functions deploy issued-certificate-download-url
```

Make sure `SUPABASE_SERVICE_ROLE_KEY` is configured as a Supabase function secret, not in frontend `.env`.

### Production data rule

Use a separate Supabase project for Kunri Citizens Portal. Do not mix Town Committee citizen data with any other project database.

---

## 20. Security and Access-Control Notes

### Role-based access model

| Role | Access |
|---|---|
| `admin` | Full system control |
| `chairman` | Monitoring, dashboards, and reports only |
| `staff` | Complaint and CMS operations |
| `certificate_officer` | Certificate final processing |
| `general_councilor` | Own ward certificate verification only |
| `citizen` | Own linked records and profile |

### Canonical role helpers

The canonical role helper patch locks role behavior for:

- `current_portal_role()`
- `is_admin()`
- `is_certificate_staff()`
- `is_user_management_staff()`
- `is_general_councilor()`
- CMS and complaint staff/read helpers

Expected role behavior:

```text
admin = full control
chairman = monitoring/read-only
staff = complaint/CMS operations
certificate_officer = certificate final processing
general_councilor = own ward verification only
citizen = own records only
```

### Important security rules

- General Councilor is not a full admin.
- General Councilor sees only assigned ward certificate applications.
- General Councilor certificate actions should go through controlled RPC workflow.
- General Councilor must not update certificate number, issued certificate path, town remarks, delivered status, or final certificate upload fields.
- Role management is admin-only.
- Ward councilor assignment is admin-only.
- Chairman access is monitoring/read-only.
- Public tracking requires tracking number and mobile number.
- Citizen private dashboard uses Supabase Auth and ownership checks.
- Final certificate access is controlled through tracking/citizen workflows and signed URLs.
- Public complaint and certificate forms include basic honeypot anti-spam fields.
- Sensitive keys must not be exposed in frontend `.env`.

### Supabase Security Advisor

Security hardening SQL is included:

```text
supabase/final-qa-security-hardening-v1.sql
supabase/security-advisor-fix-v1.sql
supabase/admin-only-role-management-fix-v1.sql
supabase/rls-certificate-security-hardening-v2.sql
supabase/canonical-role-helpers-v1.sql
```

Some public RPC functions may remain intentionally available because public citizens need to submit and track complaints/certificates without login.

### Manual security setting

Enable leaked password protection manually:

```text
Supabase Dashboard → Authentication → Security → Leaked Password Protection → Enable
```

---

## 21. Current Status

### Completed

- Public website
- Citizen signup/signin
- Citizen private dashboard
- Citizen profile completion
- Citizen record linking
- Complaint submission
- Complaint tracking
- Citizen complaint detail page
- Admin/staff complaint dashboard
- Chairman dashboard
- Chairman Executive Dashboard v2
- Reports and CSV export
- Certificate application system
- Certificate tracking
- Citizen certificate detail page
- Need correction and correction upload flow
- Ward-based General Councilor verification
- 10 ward workflow
- Certificate final processing and upload
- Private issued certificate signed URL flow
- Staff portal login with role-based redirect
- Staff and ward councilor management
- Role management
- Public CMS
- In-app notifications
- Privacy policy
- Header logo and navigation cleanup
- Favicon and PWA icons
- Production readiness docs/config
- Security hardening SQL
- Supabase Security Advisor fix SQL
- Admin-only role management fix
- Canonical role helpers
- Seed and recovery SQL
- Canonical migration chain
- UI safety confirmations and feedback states

### Demo-ready

The project is ready for internal demonstration to:

- Chairman Town Committee Kunri
- Ward General Councilors
- Town Committee staff
- Certificate Officer
- Admin users

### Production-launch dependencies

Before official public launch, Town Committee Kunri should approve the pending official details listed in the roadmap.

---

## 22. Pending Roadmap

### Pending until Town Committee approval

- SMS / WhatsApp Notifications v3

This module is intentionally pending until Town Committee approval because it requires:

- Official sender approval
- Message templates
- Citizen consent policy
- Provider selection
- API credentials
- Message cost approval

### Future enhancements

- Online payment integration for certificate fees if required
- QR verification for certificates
- Digital signature / official certificate authenticity flow
- Mobile PWA polish
- SLA analytics / advanced reporting improvements beyond v2
- Department scorecards
- Auto reminders for pending applications
- Advanced anti-spam protection such as Turnstile or hCaptcha
- Final official production launch setup
- Backup and data retention policy
- Training manual for staff and councilors
- Full user acceptance testing with Town Committee staff

### Final official content TODOs

Before public launch, confirm:

- Final portal name
- Official logo
- Chairman message
- MPA/public representative message
- Official photos
- Town Committee address
- Official phone numbers
- Official email
- Ward councilor list
- Staff assignments
- Certificate requirements
- Complaint categories
- Privacy and data ownership policy
- Domain name
- Backup and retention policy
- Official launch date

---

## 23. Demo / Presentation Flow

Recommended live demo flow:

### Part 1 — Public website

1. Open home page.
2. Show public introduction.
3. Show leadership messages.
4. Show services.
5. Show notices/news/downloads.
6. Show contact and privacy pages.

### Part 2 — Citizen account

1. Open `/citizen/login`.
2. Signup/signin as citizen.
3. Complete citizen profile.
4. Link old complaint/certificate records.
5. View private complaint detail.
6. View private certificate detail.
7. Show notifications.
8. Demonstrate need-correction response if available.

### Part 3 — Complaint system

1. Submit a new complaint.
2. Copy tracking number.
3. Track complaint as citizen.
4. Login through `/staff/login` as staff/admin.
5. Update complaint status.
6. Add public/internal remarks.
7. Upload resolution proof.
8. Show updated public tracking timeline.
9. Demonstrate confirmation before resolved status.

### Part 4 — Certificate system

1. Apply for birth/marriage/death certificate.
2. Copy certificate tracking number.
3. Login through `/staff/login` as assigned General Councilor.
4. Verify only assigned ward application.
5. Login as Certificate Officer/staff.
6. Process final certificate.
7. Add certificate number.
8. Upload prepared certificate.
9. Mark ready/delivered with confirmation.
10. Track certificate as citizen.
11. Demonstrate private issued certificate download flow.

### Part 5 — Chairman monitoring

1. Login through `/staff/login` as Chairman.
2. Open `/admin/chairman-dashboard`.
3. Show total, pending, in-progress, resolved counts.
4. Show ward-wise performance.
5. Show councilor-wise pending verification.
6. Show certificate type breakdown.
7. Show SLA buckets and delayed cases.
8. Show bottleneck alerts.
9. Show recent activity feed.
10. Open reports page and show print/CSV export options.

### Part 6 — Admin management

1. Login through `/staff/login` as Admin.
2. Show `/admin/users`.
3. Assign roles with confirmation.
4. Show `/admin/ward-councilors`.
5. Assign Ward 01–10 to General Councilors with confirmation.
6. Explain admin-only access and chairman read-only access.

---

## 24. Maintainer / Project Ownership

### Project

```text
kunri-citizens-portal
```

### Organization

```text
Town Committee Kunri
```

### Supervision

```text
Chairman Town Committee Kunri
```

### Technical maintainer

```text
TODO: Add technical maintainer name, email, phone, and GitHub profile.
```

### Data ownership

```text
TODO: Confirm official data ownership and retention policy with Town Committee Kunri before public launch.
```

### Repository

```text
TODO: Add final GitHub repository URL.
```

---

## 25. Notes for Developers

- Use only Supabase anon/publishable key in frontend.
- Never commit `.env`, `.env.local`, service role keys, or secret files.
- Run SQL files in the documented order.
- Use the canonical migration chain for clean/future rebuilds.
- Use seed templates for role/ward recovery after auth user deletion.
- Run `npm run check` before deployment.
- Keep role access strict.
- Do not make General Councilors full admins.
- Keep Chairman read-only for monitoring/reporting.
- Keep issued certificates private and serve through verified signed URL flow.
- Keep SMS/WhatsApp notifications pending until official approval.
- Do not mix this portal database with other app databases.
