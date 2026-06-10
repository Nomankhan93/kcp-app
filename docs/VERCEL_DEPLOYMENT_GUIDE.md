# Vercel Deployment Guide

## 1. Push to GitHub

```bash
git add .
git commit -m "Prepare production deployment"
git push
```

## 2. Import in Vercel

Vercel > Add New Project > Import GitHub repository.

Settings:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## 3. Add environment variables

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Use Cloud Supabase values, not local `127.0.0.1` values.

## 4. Deploy

After deployment, test:

```text
/
/submit
/track
/certificates/apply
/certificates/track
/admin/login
/councilor/certificates
```

## 5. Domain

Connect official domain only after Town Committee approves the final name and public content.
