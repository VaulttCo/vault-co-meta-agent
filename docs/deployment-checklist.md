# Deployment Checklist

Complete this checklist before giving anyone outside the team access to the portal.

## Build & Code

- [ ] `npm run build` passes with zero TypeScript errors
- [ ] All 19 routes appear in the build output
- [ ] `npm run lint` passes (or lint warnings are understood and intentional)
- [ ] No `console.log` statements left in production code paths

## Environment Variables

- [x] `AI_PROVIDER` set to `anthropic`
- [x] `ANTHROPIC_API_KEY` added to Vercel env vars
- [x] `NEXT_PUBLIC_SUPABASE_URL` added
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` added
- [x] `SUPABASE_SERVICE_ROLE_KEY` added
- [ ] No API keys committed to git (check `git log --all --full-history -- .env*`)

> **Secrets hygiene:** `.env.local` is gitignored (`.gitignore` has `.env*` with a `!.env.example` exception) and must **never** be committed. If `MAGIC_API_KEY` or `CRON_SECRET` were ever exposed in local logs, terminal output, or chat, **rotate them** and update the Vercel env vars.

## Database (Supabase)

- [x] Schema applied: all 8 tables exist (clients, approvals, campaign_drafts, reports, client_intelligence, creative_assets, files, integration_connections)
- [x] Seed data loaded for demo clients
- [ ] Row Level Security policies reviewed (default: service role bypasses RLS — fine for server routes, check client-side queries)
- [x] Storage bucket `client-files` created in Supabase Storage
- [x] Storage bucket `creative-assets` created in Supabase Storage
- [x] Storage bucket `creative-thumbnails` created in Supabase Storage
- [x] Storage bucket `onboarding-summaries` created in Supabase Storage
- [x] Storage bucket `reports` created in Supabase Storage
- [ ] Settings page shows "Supabase" as active provider (not "Mock")

## Auth (CRITICAL — do before client access)

- [x] **Supabase Auth is implemented by default** — `AuthProvider` uses Supabase Auth (email/password, magic link, or SSO) for real users. The demo role-picker is **local/dev only**: it is gated by `NODE_ENV !== "production"` and only activates when `NEXT_PUBLIC_AUTH_MODE=demo`.
- [ ] **Production must NOT set `NEXT_PUBLIC_AUTH_MODE=demo`** — confirm it is unset (or any value other than `demo`) in the Vercel production environment. Demo mode cannot activate in production regardless, but do not rely on that alone.
- [ ] Real user accounts created in Supabase Auth with correct roles

## AI / Veronica

- [ ] Veronica campaign builder tested end-to-end with live AI key
- [ ] Mock mode notice does NOT appear when `AI_PROVIDER=anthropic` and key is valid
- [ ] Report generation tested — reports persist to Supabase when `clientId` is provided
- [ ] Safety rule visible in Campaign Builder: "Veronica cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without human approval."

## Integrations (if applicable)

- [ ] GHL webhook URL configured in Settings (if connecting real GHL)
- [ ] Meta Business Manager credentials documented (if connecting real Meta API)
- [ ] Any integration keys stored in Vercel env vars — not hardcoded

## Client Data

- [ ] Real client data entered (or confirmed that demo data is acceptable for early access)
- [ ] Client intelligence extracted for each active client
- [ ] Creative assets uploaded for at least one client
- [ ] At least one campaign draft generated and moved through the approval workflow as a test

## Pre-launch Smoke Test

Walk through each of these after deploying to production:

1. Sign in with a valid account
2. Dashboard loads with correct client count and stats
3. Navigate to Veronica — generate a full campaign draft
4. Submit the draft for approval
5. Go to Approvals — approve the draft
6. Go to a client profile — view the intelligence tab
7. Go to Reports — confirm "Prepared by Veronica" appears on ready reports
8. Go to Settings — confirm Data Provider shows Supabase (not Mock)
9. Sign out and confirm the login screen appears

## After Launch

- [ ] Share the URL only with intended users
- [ ] Document who has access and their roles
- [ ] Confirm production is running Supabase Auth (no `NEXT_PUBLIC_AUTH_MODE=demo`) before expanding access
- [ ] Monitor Vercel function logs for the first 24 hours
