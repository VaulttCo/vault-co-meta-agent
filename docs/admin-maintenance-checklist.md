# Vault Co — Admin Maintenance Checklist

Use this checklist for routine platform health checks. Run weekly unless noted.

---

## Pre-Check: Environment Variables

Before any maintenance session, verify Vercel env vars are present and non-empty:

| Variable | Required For |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase features |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes (route handlers) |
| `ANTHROPIC_API_KEY` | Live AI campaign generation |
| `AI_PROVIDER` | Must be `anthropic` for live AI (not `mock`) |
| `META_APP_ID` / `META_APP_SECRET` | Meta integration |
| `GHL_API_KEY` | GHL integration |

**Check:** Vercel dashboard → Project → Settings → Environment Variables. Confirm all are set for **Production** environment. Redeploy after any change.

---

## Weekly Checklist

### Auth & Access
- [ ] Log in as admin — confirm dashboard loads, no auth redirect loops
- [ ] Confirm `/settings` shows integration status for Meta and GHL
- [ ] Confirm `/approvals` loads with no JS console errors

### Data Integrity
- [ ] Go to `/clients` — all clients load, search and filter work
- [ ] Go to `/creatives` — uploaded assets visible after page refresh (not just on upload)
- [ ] Check for creative assets with missing thumbnails (broken `<img>` placeholders)
- [ ] Check for stale `Uploaded` status rows older than 14 days with no action taken

### AI
- [ ] Go to `/ai-agent` — confirm **no** "Mock AI mode" banner if `AI_PROVIDER=anthropic`
- [ ] Generate one test draft — confirm it completes and all sections render
- [ ] Check Anthropic dashboard for usage anomalies or quota warnings

### Approvals Queue
- [ ] Review `/approvals` for drafts in `needs_review` older than 7 days — follow up with submitter
- [ ] Confirm approved drafts have been handed off to media buyer

---

## Monthly Checklist

### Creative Assets Audit
Run these queries in the Supabase SQL Editor:

```sql
-- Duplicate filenames per client
SELECT file_name, client_id, COUNT(*) as cnt
FROM public.creative_assets
GROUP BY file_name, client_id
HAVING COUNT(*) > 1
ORDER BY cnt DESC;

-- Stale uploaded rows with no storage URL
SELECT id, client_id, file_name, upload_date, status
FROM public.creative_assets
WHERE storage_url IS NULL
  AND status = 'uploaded'
  AND upload_date < NOW() - INTERVAL '14 days'
ORDER BY upload_date;

-- Status distribution
SELECT status, COUNT(*) FROM public.creative_assets GROUP BY status ORDER BY count DESC;
```

Review results and clean up orphaned or duplicate rows as appropriate.

### Storage Bucket Audit
- [ ] In Supabase Storage, list files in the `creative-assets` bucket
- [ ] Cross-reference with `creative_assets` table rows (matching `storage_url`)
- [ ] Delete orphaned storage files (no matching DB row)

### Role & Access Audit
- [ ] Query `user_profiles` to confirm all active users have the correct role assigned
- [ ] Revoke access for any users who should no longer have platform access (set `role = NULL` or delete row)

### Dependency Check
- [ ] Run `npm audit` locally — review and address high/critical vulnerabilities
- [ ] Check for Next.js patch releases; update if a security fix is included

---

## API Auth Audit (known findings)

| Route | Auth Status | Notes |
|---|---|---|
| `/api/ai/generate-campaign` | ✅ Protected | `resolveServerRole()` + `canGenerateCampaigns` |
| `/api/creatives/save-metadata` | ✅ Protected | `resolveServerRole()` + `canUploadFiles` |
| `/api/creatives/analyze` | ✅ Protected | Server-side role validation |
| `/api/veronica` | ✅ Protected | Server-side role validation |
| `/api/extract-pdf-text` | ⚠️ Unprotected | No auth check — any authenticated request (or unauthenticated) can call this. Remediate before client-facing launch. |
| `/api/debug/env` | ✅ Protected | Admin auth added |

---

## Incident Response

If the Creative Library stops showing uploaded assets after refresh:
1. Check Supabase RLS policies — confirm `SELECT` policy allows `get_user_role() IN ('admin', 'media_buyer', 'setter')`
2. Verify `creative_assets` rows have valid `status` values (`uploaded`, `active`, `pending`, `archived`)
3. Check `asset_type` values — only 12 valid types; invalid values fall back to `Project Reveal` (image) or `UGC Style Video` (video) in the frontend
4. Check `category` values — must be `client_asset`, `creative_asset`, or `onboarding_summary` in DB

If the AI Campaign Builder shows "Mock AI mode":
1. Confirm `AI_PROVIDER=anthropic` in Vercel env vars (Production)
2. Confirm `ANTHROPIC_API_KEY` is non-empty
3. Redeploy if vars were just added/changed
