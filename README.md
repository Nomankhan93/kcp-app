# Kunri Citizens Portal

**Kunri Citizens Portal (KCP)** is a digital citizen service platform for **Town Committee Kunri** under the supervision of the **Chairman Town Committee Kunri**.

The portal provides public website pages, citizen complaint services, birth/marriage/death certificate applications, ward-based General Councilor verification, Town Committee staff dashboards, Chairman monitoring dashboards, public CMS content management, citizen login/profile features, reports, and role-based access control.

---

## 1. Project Title

**Kunri Citizens Portal**
**Town Committee Kunri – Digital Citizen Services Platform**

---

## 2. Short Overview

Kunri Citizens Portal is built to modernize municipal public services for the citizens of Kunri. It allows citizens to submit complaints, track complaint status, apply for certificates, track certificate applications, create citizen accounts, manage their profiles, view their own records, and receive in-app status updates.

The portal also provides operational dashboards for Town Committee staff, ward General Councilors, Certificate Officers, Admin users, and Chairman-level monitoring.

---

## 3. Purpose and Objectives

The purpose of this project is to create a transparent, organized, and citizen-friendly digital platform for Town Committee Kunri.

### Main objectives

* Provide online access to municipal services.
* Reduce repeated office visits and manual follow-ups.
* Digitize complaint intake, tracking, and resolution records.
* Digitize birth, marriage, and death certificate application workflow.
* Assign certificate verification responsibility to ward General Councilors.
* Provide Chairman-level monitoring and reports.
* Allow staff to manage public notices, news, downloads, and leadership messages.
* Maintain structured records with tracking numbers, status history, remarks, and document uploads.
* Improve accountability through role-based access control.

---

## 4. Key Users and Roles

| Role                  | Purpose                        | Access Level                                                                                      |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `citizen`             | Public user / resident         | Signup, signin, profile, submit complaints, apply certificates, track records, view own dashboard |
| `admin`               | System administrator           | Full control including users, roles, CMS, complaints, certificates, reports, and ward assignments |
| `chairman`            | Chairman Town Committee Kunri  | Monitoring, overview dashboards, reports, and performance visibility                              |
| `staff`               | Town Committee staff           | Operational access for complaints, CMS, and assigned workflows                                    |
| `certificate_officer` | Certificate processing officer | Final certificate processing, certificate number, certificate upload, and delivery status         |
| `general_councilor`   | Ward General Councilor         | Limited access only to certificate applications from assigned ward                                |

### Important access rule

A **General Councilor is not a full admin**.

Each General Councilor has only the `general_councilor` role and verifies only certificate applications from the assigned ward. There are **10 wards** in the current workflow.

---

## 5. Features Built

### Public website / citizen-facing portal

Built public pages include:

* Home page
* Town Committee Kunri introduction
* Chairman message
* Leadership messages with MPA/public representative and Chairman content
* Services page
* Notices page
* News / updates page
* Downloads / forms page
* Contact page
* Privacy Policy page
* Clean header logo and navigation
* Favicon and PWA icon assets

### Citizen account system

Built citizen account features:

* Citizen signup and signin
* Citizen private dashboard
* Citizen profile completion
* Profile completion percentage
* Link old complaint/certificate records using tracking number and mobile
* Private complaint detail pages
* Private certificate detail pages
* Citizen notifications page
* Need-correction response flow
* Correction document upload for certificate applications

### Complaint system

Built complaint features:

* Public complaint submission
* Complaint tracking with tracking number and mobile
* Complaint categories
* Ward / area / mohalla fields
* Optional photo upload
* Tracking number generation
* Complaint status timeline
* Admin/staff complaint dashboard
* Complaint filters and search
* Staff/department assignment
* Public remarks and internal remarks
* Resolution proof upload
* Complaint reports and CSV export

### Certificate system

Built certificate features:

* Birth certificate application
* Marriage certificate application
* Death certificate application
* Certificate tracking
* Certificate status timeline
* Required information and document upload support
* Ward-based General Councilor verification
* Need Correction / correction response flow
* Town Committee final processing
* Certificate number entry
* Prepared certificate PDF/image upload
* Ready for collection / delivered status
* Citizen private certificate detail page
* Certificate final processing dashboard

### Ward General Councilor workflow

Built councilor workflow:

* 10 ward setup
* `general_councilor` role
* Councilor dashboard
* Councilor sees only assigned ward certificate applications
* Councilor can verify, reject, or mark need correction
* Councilor remarks are required
* Councilor verification history is saved
* Inactive councilors can be disabled without deleting history

### Admin and staff management

Built admin/staff features:

* `/admin/users` role management
* `/admin/ward-councilors` ward councilor assignment
* Admin-only user and ward management
* Staff and role management
* CMS management
* Complaint management
* Certificate management
* Reports and monitoring tools

### Public CMS

Built CMS features:

* Public notices management
* News / updates management
* Downloads / forms management
* Leadership messages management
* CMS file uploads through Supabase Storage
* Public pages load published CMS content

### Security and production readiness

Built security/production features:

* Role-based access-control helpers
* Admin-only role and ward management
* Chairman monitoring-oriented access
* Public form honeypot anti-spam fields
* Privacy Policy page
* Vercel deployment configuration
* SPA route rewrites
* Static asset cache headers
* Basic security headers
* Supabase storage bucket setup
* Supabase security hardening SQL
* Supabase Security Advisor fix SQL
* Route-based lazy loading / code splitting
* `.env.example`
* `.env.production.example`

---

## 6. Citizen Workflow

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

## 7. Complaint Workflow

### Citizen complaint submission

Route:

```text
/submit
```

Citizen submits:

* Name
* Mobile number
* CNIC optional
* Ward / area
* Mohalla
* Complaint category
* Complaint details
* Optional photo upload

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

* Tracking number
* Mobile number

Complaint statuses include:

* Submitted
* Received
* In Progress
* Resolved
* Rejected
* Not Related

### Admin/staff complaint handling

Routes:

```text
/admin
/admin/complaints/:id
```

Admin/staff can:

* View complaints
* Search complaints
* Filter by status, category, area/ward, and date
* Assign staff or department
* Update status
* Add public remarks
* Add internal notes
* Upload resolution proof
* Maintain status history

---

## 8. Certificate Workflow

### Certificate application

Route:

```text
/certificates/apply
```

Citizens can apply for:

* Birth Certificate
* Marriage Certificate
* Death Certificate

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

* Tracking number
* Mobile number

### Certificate statuses

Certificate workflow supports statuses such as:

* Submitted
* Councilor Review
* Councilor Verified
* Councilor Rejected
* Under Office Processing
* Need Correction / More Info
* Certificate Uploaded
* Ready for Collection
* Delivered
* Rejected

### Final processing

Routes:

```text
/admin/certificates
/admin/certificates/:id
/admin/certificates/final-processing
```

Town Committee staff or Certificate Officer can:

* Review councilor-verified applications
* Check documents
* Add certificate number
* Upload prepared certificate PDF/image
* Update delivery status
* Add final remarks

---

## 9. Ward General Councilor Workflow

Kunri Citizens Portal includes a ward-based certificate verification system.

### Ward model

* Total wards: **10**
* Ward labels: `Ward 01` to `Ward 10`
* Each ward can be assigned one active General Councilor login user.
* Inactive councilors can be disabled without deleting historical records.

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

* Login to councilor dashboard.
* View certificate applications from assigned ward only.
* Open application details.
* Review submitted information and documents.
* Mark application as verified, rejected, or need correction.
* Add verification remarks.

A General Councilor cannot:

* Access full admin dashboard.
* Manage users.
* Manage roles.
* Manage all wards.
* Upload final certificate.
* Process certificates after verification.

---

## 10. Admin / Staff Workflow

### Admin dashboard

Route:

```text
/admin
```

Admin/staff dashboard provides access to complaint management, certificate management, reports, CMS, and management links depending on role.

### User role management

Route:

```text
/admin/users
```

This page is **admin-only**.

Admin can assign roles:

* `admin`
* `chairman`
* `staff`
* `certificate_officer`
* `general_councilor`

### Ward councilor management

Route:

```text
/admin/ward-councilors
```

This page is **admin-only**.

Admin can:

* Assign Ward 01 to Ward 10 to councilor users.
* Update councilor name.
* Update mobile number.
* Enable or disable a councilor assignment.
* Change active councilor without deleting historical records.

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

* Notices
* News / updates
* Downloads / forms
* Leadership messages

---

## 11. Chairman Monitoring Workflow

Chairman access is designed for monitoring and reporting.

Routes:

```text
/admin/chairman-dashboard
/admin/reports
```

Chairman can monitor:

* Total complaints
* Pending complaints
* In-progress complaints
* Resolved complaints
* High priority issues
* Department-wise performance
* Ward-wise issue summary
* Long pending complaints
* Daily, weekly, monthly, and all-time reports
* Certificate application progress
* Ward/councilor responsibility trends

### Chairman access policy

Chairman is not intended to manage users or ward assignments.

Final access model:

| Role                  | Intended Access                     |
| --------------------- | ----------------------------------- |
| `admin`               | Full control                        |
| `chairman`            | Monitoring, dashboards, reports     |
| `staff`               | Operational complaint/CMS workflows |
| `certificate_officer` | Certificate final processing        |
| `general_councilor`   | Own ward certificate verification   |
| `citizen`             | Own profile and linked records      |

---

## 12. Tech Stack Detected from Project Files

The stack below is detected from `package.json`, `src`, `supabase`, and config files.

| Area                  | Technology                  |
| --------------------- | --------------------------- |
| Frontend              | React `19.1.1`              |
| Build tool            | Vite `7.2.0`                |
| Language              | TypeScript `5.9.3`          |
| Routing               | React Router DOM `7.9.5`    |
| Backend / BaaS        | Supabase                    |
| Database              | PostgreSQL through Supabase |
| Auth                  | Supabase Auth               |
| Storage               | Supabase Storage            |
| Icons                 | `lucide-react`              |
| Styling               | Tailwind CSS `3.4.17`       |
| Deployment config     | Vercel                      |
| Local Supabase config | `supabase/config.toml`      |

---

## 13. Folder Structure

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
│   │   └── SetupNotice.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── complaints.ts
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
│   └── admin-only-role-management-fix-v1.sql
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

## 14. Environment Variables

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

### Important security rule

Never place Supabase `service_role` keys or secret backend keys in frontend environment variables.

---

## 15. Local Setup Instructions

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

Run the Supabase SQL files in the correct order.

Local example:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/schema.sql
```

Repeat for each SQL file in the order listed in the database setup section.

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

## 16. Supabase / Database Setup Notes

### Recommended SQL order

Run these files in order for local or cloud Supabase:

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
```

### First admin user

After creating the first Auth user in Supabase, assign the `admin` role using SQL or the provided setup file.

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

| Bucket                  | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `complaint-photos`      | Complaint photo uploads and resolution proof                            |
| `certificate-documents` | Certificate application documents, corrections, and issued certificates |
| `cms-files`             | Public CMS files such as forms, images, and downloadable documents      |

### Supabase Auth recommendations

For production:

* Enable email confirmation if required by Town Committee policy.
* Enable leaked password protection in Supabase Dashboard.
* Use strong admin passwords.
* Do not share admin accounts between staff.
* Keep service role keys out of frontend code.

---

## 17. Available Scripts

Detected from `package.json`.

| Script      | Command                                   | Purpose                                    |
| ----------- | ----------------------------------------- | ------------------------------------------ |
| `dev`       | `vite --host 0.0.0.0 --port 3000`         | Start local development server             |
| `build`     | `tsc -b && vite build`                    | TypeScript build and Vite production build |
| `preview`   | `vite preview --host 0.0.0.0 --port 4173` | Preview production build locally           |
| `typecheck` | `tsc -b --pretty false`                   | Run TypeScript type checking               |
| `check`     | `npm run typecheck && npm run build`      | Run full local verification                |

Recommended before commit/deploy:

```bash
npm run check
```

---

## 18. Deployment Notes

### Vercel

`vercel.json` is included and configures:

* Vite framework
* Build command: `npm run build`
* Output directory: `dist`
* SPA route rewrite to `index.html`
* Asset cache headers
* Basic security headers

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

### Production data rule

Use a separate Supabase project for Kunri Citizens Portal. Do not mix Town Committee citizen data with any other project database.

---

## 19. Security and Access-Control Notes

### Role-based access model

| Role                  | Access                                 |
| --------------------- | -------------------------------------- |
| `admin`               | Full system control                    |
| `chairman`            | Monitoring, dashboards, and reports    |
| `staff`               | Complaint and CMS operations           |
| `certificate_officer` | Certificate final processing           |
| `general_councilor`   | Own ward certificate verification only |
| `citizen`             | Own linked records and profile         |

### Important security rules

* General Councilor is not a full admin.
* General Councilor sees only assigned ward certificate applications.
* Role management is admin-only.
* Ward councilor assignment is admin-only.
* Chairman access is monitoring-oriented.
* Public tracking requires tracking number and mobile number.
* Citizen private dashboard uses Supabase Auth and ownership checks.
* Final certificate access is controlled through tracking/citizen workflows.
* Public complaint and certificate forms include basic honeypot anti-spam fields.
* Sensitive keys must not be exposed in frontend `.env`.

### Supabase Security Advisor

Security hardening SQL is included:

```text
supabase/final-qa-security-hardening-v1.sql
supabase/security-advisor-fix-v1.sql
supabase/admin-only-role-management-fix-v1.sql
```

Some public RPC functions may remain intentionally available because public citizens need to submit and track complaints/certificates without login.

### Manual security setting

Enable leaked password protection manually:

```text
Supabase Dashboard → Authentication → Security → Leaked Password Protection → Enable
```

---

## 20. Current Status

### Completed

* Public website
* Citizen signup/signin
* Citizen private dashboard
* Citizen profile completion
* Citizen record linking
* Complaint submission
* Complaint tracking
* Citizen complaint detail page
* Admin/staff complaint dashboard
* Chairman dashboard
* Reports and CSV export
* Certificate application system
* Certificate tracking
* Citizen certificate detail page
* Need correction and correction upload flow
* Ward-based General Councilor verification
* 10 ward workflow
* Certificate final processing and upload
* Staff and ward councilor management
* Role management
* Public CMS
* In-app notifications
* Privacy policy
* Header logo and navigation cleanup
* Favicon and PWA icons
* Production readiness docs/config
* Security hardening SQL
* Supabase Security Advisor fix SQL
* Admin-only role management fix

### Demo-ready

The project is ready for internal demonstration to:

* Chairman Town Committee Kunri
* Ward General Councilors
* Town Committee staff
* Certificate Officer
* Admin users

### Production-launch dependencies

Before official public launch, Town Committee Kunri should approve the pending official details listed in the roadmap.

---

## 21. Pending Roadmap

### Pending until Town Committee approval

* SMS / WhatsApp Notifications v3

This module is intentionally pending until Town Committee approval because it requires:

* Official sender approval
* Message templates
* Citizen consent policy
* Provider selection
* API credentials
* Message cost approval

### Future enhancements

* Online payment integration for certificate fees if required
* QR verification for certificates
* Digital signature / official certificate authenticity flow
* Mobile PWA polish
* SLA analytics and advanced reporting
* Department scorecards
* Auto reminders for pending applications
* Advanced anti-spam protection such as Turnstile or hCaptcha
* Final official production launch setup
* Backup and data retention policy
* Training manual for staff and councilors

### Final official content TODOs

Before public launch, confirm:

* Final portal name
* Official logo
* Chairman message
* MPA/public representative message
* Official photos
* Town Committee address
* Official phone numbers
* Official email
* Ward councilor list
* Staff assignments
* Certificate requirements
* Complaint categories
* Privacy and data ownership policy
* Domain name

---

## 22. Demo / Presentation Flow

Recommended live demo flow:

### Part 1 — Public website

1. Open home page.
2. Show public introduction.
3. Show leadership messages.
4. Show services.
5. Show notices/news/downloads.
6. Show contact and privacy pages.

### Part 2 — Complaint system

1. Submit a new complaint.
2. Copy tracking number.
3. Track complaint as citizen.
4. Login as staff/admin.
5. Update complaint status.
6. Add public/internal remarks.
7. Upload resolution proof.
8. Show updated public tracking timeline.

### Part 3 — Certificate system

1. Apply for birth/marriage/death certificate.
2. Copy certificate tracking number.
3. Login as assigned General Councilor.
4. Verify only assigned ward application.
5. Login as Certificate Officer/staff.
6. Process final certificate.
7. Add certificate number.
8. Upload prepared certificate.
9. Track certificate as citizen.

### Part 4 — Citizen account

1. Signup/signin as citizen.
2. Complete citizen profile.
3. Link old complaint/certificate records.
4. View private complaint detail.
5. View private certificate detail.
6. Show notifications.
7. Demonstrate need-correction response if available.

### Part 5 — Chairman monitoring

1. Open Chairman dashboard.
2. Show total, pending, in-progress, resolved counts.
3. Show ward-wise and department-wise performance.
4. Open reports page.
5. Show print and CSV export options.

### Part 6 — Admin management

1. Show `/admin/users`.
2. Assign roles.
3. Show `/admin/ward-councilors`.
4. Assign Ward 01–10 to General Councilors.
5. Explain admin-only access.

---

## 23. Maintainer / Project Ownership

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

## Notes for Developers

* Use only Supabase anon/publishable key in frontend.
* Never commit `.env`.
* Run SQL migrations in the documented order.
* Run `npm run check` before deployment.
* Keep role access strict.
* Do not make General Councilors full admins.
* Keep SMS/WhatsApp notifications pending until official approval.
* Do not mix this portal database with other app databases.
