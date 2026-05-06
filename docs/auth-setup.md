# Vault Co — Veronica Portal: Auth Setup Guide

**Status: LIVE — Supabase Auth is active in production.**

---

## Overview

The Veronica Portal uses **Supabase Auth** (email/password + magic link) with **role-based access control** enforced at the Next.js middleware layer. Every request to a protected route is validated server-side before the page renders.

---

## What Is Already Done (One-Time Setup Complete)

| Step | Status |
| :--- | :--- |
| `user_profiles` table created in Supabase | Done |
| RLS (Row Level Security) enabled on `user_profiles` | Done |
| Auto-insert trigger on `auth.users` to `user_profiles` | Done |
| Public signups disabled | Done |
| `NEXT_PUBLIC_AUTH_MODE=supabase` set in Vercel | Done |
| Nick Moore (`nick@anuagency.info`) created as Admin | Done |
| Jaxon (`jaxonparton10@gmail.com`) created as Admin | Done |

---

## Current Admin Users

| Name | Email | Role | Status |
| :--- | :--- | :--- | :--- |
| Nick Moore | nick@anuagency.info | admin | active |
| Jaxon | jaxonparton10@gmail.com | admin | active |

---

## First Login Instructions

### Nick Moore
Use the **Magic Link** tab on the login page to receive a one-time sign-in link at `nick@anuagency.info`. No password needed unless you set one.

### Jaxon
A temporary password was set during account creation: `VaultCo2026!Temp`

**Jaxon must change his password after first login:**
1. Log in at [vault-co-meta-agent.vercel.app/login](https://vault-co-meta-agent.vercel.app/login) with email `jaxonparton10@gmail.com` and the temporary password above
2. Go to **Settings** and update the password, or use the **Magic Link** tab to sign in without a password going forward

---

## How to Add New Team Members

1. Go to [Supabase Dashboard → Authentication → Users](https://supabase.com/dashboard/project/mxfinioxtqupkmctgqcl/auth/users)
2. Click **Add User → Create new user**
3. Enter their email and a temporary password
4. The `user_profiles` row is created automatically by the trigger with role `setter` (default)
5. To change the role, go to **Table Editor → user_profiles** and update the `role` column to `admin`, `media_buyer`, or `setter`

---

## Role Permissions

| Feature | Admin | Media Buyer | Setter |
| :--- | :---: | :---: | :---: |
| Dashboard | Yes | Yes | Yes |
| Clients (view) | Yes | Yes | Yes |
| Clients (create/edit) | Yes | Yes | No |
| Campaigns | Yes | Yes | No |
| Analytics | Yes | Yes | No |
| Reports | Yes | Yes | No |
| Approvals | Yes | Yes | Yes |
| Creatives | Yes | Yes | No |
| Settings | Yes | No | No |
| AI Tools | Yes | Yes | No |

---

## Route Protection

All routes are protected at the **Next.js Edge Middleware** layer (`src/middleware.ts`). Unauthenticated requests are redirected to `/login?next=<original-route>` before any page renders. After login, the user is redirected back to the original route.

The `/login` and `/auth/callback` routes are public (no auth required).

---

## Local Development (Demo Mode)

To use the demo role-picker locally without Supabase credentials:

```bash
# .env.local
NEXT_PUBLIC_AUTH_MODE=demo
```

This restores the mock role-picker. **Never set this in Vercel production environment variables.**

---

## Magic Link Configuration (Supabase)

Ensure the following redirect URL is set in Supabase:

1. Go to [Authentication → URL Configuration](https://supabase.com/dashboard/project/mxfinioxtqupkmctgqcl/auth/url-configuration)
2. Set **Site URL** to: `https://vault-co-meta-agent.vercel.app`
3. Add to **Redirect URLs**: `https://vault-co-meta-agent.vercel.app/auth/callback`

---

## Database Migration Reference

The `user_profiles` table was created by `docs/migrations/001_user_profiles.sql`. It contains:

- `id` — UUID primary key
- `auth_user_id` — references `auth.users(id)` with cascade delete
- `email` — user email
- `full_name` — display name
- `role` — one of `admin`, `media_buyer`, `setter`
- `status` — one of `active`, `inactive`
- `created_at`, `updated_at` — timestamps

A trigger automatically inserts a row into `user_profiles` whenever a new user is created in `auth.users`.

---

## Supabase Project Details

| Property | Value |
| :--- | :--- |
| Project Ref | `mxfinioxtqupkmctgqcl` |
| Region | us-east-1 |
| Dashboard | [supabase.com/dashboard/project/mxfinioxtqupkmctgqcl](https://supabase.com/dashboard/project/mxfinioxtqupkmctgqcl) |

---

## Using Permissions in Components

```tsx
import { useAuth } from "@/components/AuthProvider";

export function MyComponent() {
  const { can } = useAuth();

  if (!can("canApproveCampaigns")) {
    return <div>Access Denied</div>;
  }

  return <button>Approve</button>;
}
```

Permissions are mapped in `src/lib/auth/permissions.ts`.

---

*Last updated: May 2026 — Setup completed*
