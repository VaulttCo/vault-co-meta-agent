# Vault Co — Client Access Readiness Guide

Checklist and criteria for determining when the Vault Co platform is ready to grant access to a client or external stakeholder.

> **Scope:** This document covers read-only client-facing access (e.g., a roofing company owner reviewing their campaign reports and creative library). It does not cover admin or media buyer access.

---

## Current Role Status

| Role | Exists in DB schema | RLS policies exist | Ready for external use |
|---|---|---|---|
| `admin` | ✅ | ✅ | ✅ Internal only |
| `media_buyer` | ✅ | ✅ | ✅ Internal only |
| `setter` | ✅ | ✅ | ⚠️ Read-only; limited UI tested |
| `client_viewer` | ❌ Not defined | ❌ None | ❌ Deferred — not ready |

**Decision:** Client-facing access is deferred until a `client_viewer` role is defined, RLS policies are written, and the restricted UI is tested end-to-end.

---

## Readiness Gate: What Must Be True Before Granting Client Access

### Auth & Onboarding
- [ ] Client has a Supabase Auth account (`user_profiles` row exists with correct `role`)
- [ ] Login page (`/login`) works with email/password for the client's email
- [ ] Auth redirect sends client to the correct landing page (not admin-only areas)
- [ ] Client cannot access `/settings`, `/approvals`, or the AI Agent (`/ai-agent`)
- [ ] Unauthenticated requests to `/api/*` return 401

### Data Isolation
- [ ] Client can only see their own data (RLS `client_id = auth.uid()` or equivalent policy in place)
- [ ] Client cannot see other clients' creative assets, campaign drafts, or reports
- [ ] Confirm with a manual SQL test: log in as client, run `SELECT * FROM creative_assets` — should return only rows for that client

### Creative Library
- [ ] Client can view their creative assets at `/creatives`
- [ ] Client cannot upload, delete, or approve assets (buttons hidden or disabled based on role)
- [ ] Assets have valid `storage_url` values — client-facing broken images are not acceptable

### Reports
- [ ] Reports page (`/reports`) loads client-specific data only
- [ ] No internal notes, draft status labels, or admin-only fields are visible to the client

### UI Hardening
- [ ] Navigation sidebar hides admin-only items for `client_viewer` role
- [ ] All page-level role guards tested: unauthenticated redirect, wrong-role redirect
- [ ] No raw error messages or stack traces visible to client on error

---

## Pre-Launch Checklist (per client)

Complete for each client before granting them portal access:

- [ ] Client record exists in `/clients` with correct name, market, and status
- [ ] At least one campaign draft in `approved` or `ready_for_meta` status
- [ ] Creative assets uploaded and at least one in `Approved` status
- [ ] Onboarding summary PDF uploaded and intelligence extracted
- [ ] Client's Supabase Auth account created and role assigned
- [ ] Client walkthrough completed (screen share or video walkthrough of the portal)
- [ ] Support contact provided to client

---

## Known Blockers (as of 2026-05-10)

1. **`client_viewer` role not implemented** — No DB role definition, no RLS policies, no UI role-gating for this role. Estimated effort: 1–2 days to define role, write RLS, test in staging.

2. **`/api/extract-pdf-text` is unprotected** — Any caller can invoke this endpoint. Must add `resolveServerRole()` auth check before any client-facing launch.

3. **Client data isolation not verified** — Current RLS policies grant access based on `get_user_role()` returning a valid role, not per-client row-level isolation. A `setter` can currently SELECT all rows across all clients. Per-client isolation requires adding `client_id` conditions to SELECT policies.

4. **No email verification flow** — Supabase Auth is configured but there is no confirmed email verification step for new client accounts. Recommend enabling email confirmation in Supabase Auth settings.

---

## Recommended Staging Test Protocol

Before granting any external access:

1. Create a test user with `setter` role (closest to future `client_viewer`)
2. Log in as that user in a private browser window
3. Verify: can view `/clients`, `/creatives`, `/analytics`
4. Verify: cannot access `/settings`, `/approvals`, `/ai-agent`
5. Verify: all API routes that return data return only appropriate records
6. Attempt direct navigation to another client's detail page — should redirect or show empty state
7. Attempt unauthenticated API calls to `/api/creatives/analyze` and `/api/ai/generate-campaign` — should return 401

Document results and resolve any failures before proceeding to production client access.
