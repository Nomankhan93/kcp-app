# Production Readiness & Deployment v1

## Summary

This patch prepares Kunri Citizens Portal for Cloud Supabase + Vercel deployment.

## Changed / added files

- `.env.example`
- `.env.production.example`
- `.gitignore`
- `vercel.json`
- `package.json`
- `README.md`
- `public/robots.txt`
- `public/sitemap.xml`
- `src/App.tsx`
- `supabase/production-readiness-v1.sql`
- `docs/PRODUCTION_READINESS_DEPLOYMENT_V1.md`
- `docs/CLOUD_SUPABASE_SETUP.md`
- `docs/VERCEL_DEPLOYMENT_GUIDE.md`
- `docs/SECURITY_ACCEPTANCE_CHECKLIST.md`
- `docs/DEPLOYMENT_RUN_COMMANDS.md`

## Important fix

The Councilor Dashboard routes are now registered:

- `/councilor/certificates`
- `/councilor/certificates/:id`

## SQL

Run after all previous module SQL files:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/production-readiness-v1.sql
```

## Test

```bash
npm run typecheck
npm run build
```
