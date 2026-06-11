# KCP Final QA & Security Hardening v1

## Added
- `supabase/final-qa-security-hardening-v1.sql`
- `.env.example`
- `.env.production.example`
- `/privacy-policy` route and page
- Honeypot anti-spam field on public forms
- Route-level lazy loading in `src/App.tsx`
- Final QA documentation

## Updated
- Corrected safe CMS index logic in `supabase/production-readiness-v1.sql`
- Tightened frontend access visibility for chairman/user management/CMS/final certificate processing
- Footer now links to Privacy Policy
- Sitemap includes `/privacy-policy`

## SQL
Run after production readiness:

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/final-qa-security-hardening-v1.sql
```

Cloud: run `supabase/final-qa-security-hardening-v1.sql` in Supabase SQL Editor after all previous SQL files.
