# Deployment Run Commands

## Local apply

```bash
cd ~/projects/kunri-citizens-portal
unzip -o /mnt/c/Users/*/Downloads/kunri-production-readiness-deployment-v1.zip -d .
```

## Local build check

```bash
npm run typecheck
npm run build
```

## Local Supabase production-readiness SQL

```bash
PGPASSWORD=postgres psql \
  -h 127.0.0.1 \
  -p 55322 \
  -U postgres \
  -d postgres \
  -f supabase/production-readiness-v1.sql
```

## Git commit

```bash
git add .
git commit -m "Prepare production readiness and deployment"
git push
```
