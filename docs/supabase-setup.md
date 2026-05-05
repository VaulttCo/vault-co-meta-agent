# Supabase Setup — Vault Co

Step-by-step instructions for connecting this app to a Supabase database.

## Prerequisites

- A Supabase account (free tier is sufficient to start)
- The Vault Co app running locally (`npm run dev` working)
- Access to the project's `.env.local` file

---

## Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Name it `vault-co` (or any name you prefer)
4. Choose a region close to your users (US East or US West recommended)
5. Set a strong database password — save it somewhere secure
6. Wait for the project to provision (about 60 seconds)

---

## Step 2 — Get Your API Keys

In the Supabase dashboard, go to **Project Settings → API**.

You need three values:

| Key | Where to find it | Used for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | All client and server calls |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key | Browser-side reads |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` `secret` key | Server-side privileged writes |

The `NEXT_PUBLIC_` keys are safe to expose in browser bundles. The service role key is secret and must never appear in client-side code.

---

## Step 3 — Add Keys to `.env.local`

Open `.env.local` at the project root and add these lines:

```bash
# ─────────────────────────────────────────────────────────────
# Supabase
# Set these to activate the Supabase data provider.
# Leave blank to run in mock mode (no database required).
# ─────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Restart the dev server after editing `.env.local`:

```bash
npm run dev
```

---

## Step 4 — Run the Database Schema

In the Supabase dashboard, go to **SQL Editor** and run the SQL from `/docs/database-schema.md` in order:

1. Copy and run the `pgcrypto` extension block
2. Copy and run the `update_updated_at` function block
3. Run each table creation block in order: `clients` → `client_intelligence` → `creative_assets` → `campaign_drafts` → `approvals` → `reports` → `integration_connections`

Each block is self-contained and can be run independently if you need to recreate a single table.

---

## Step 5 — Create Storage Buckets

In the Supabase dashboard, go to **Storage** and create:

1. **`creative-assets`** — Private bucket for raw uploaded creative files
2. **`creative-thumbnails`** — Public bucket for compressed thumbnail previews

For `creative-assets`:
- Enable RLS
- Add a policy: authenticated users can `SELECT`, `INSERT`, `UPDATE` for objects where `auth.uid()` is not null

For `creative-thumbnails`:
- No RLS needed (public read)
- Authenticated write

---

## Step 6 — Verify the Connection

Start the dev server and open the app. If keys are correctly set, the data provider will switch from mock to Supabase automatically.

**Easiest way to confirm:** open **Settings → Data Provider** in the app. The panel shows:
- **Active Provider**: `Supabase` or `Mock (in-memory)`
- `NEXT_PUBLIC_SUPABASE_URL`: Set or Missing
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Set or Missing

You can also log it in code:

```ts
import { getDataProvider } from "@/lib/data/data-provider";
const db = getDataProvider();
console.log("Provider:", db.name); // "mock" or "supabase"
```

At this point, pages will mostly show empty states because the database is not yet seeded. That is expected.

---

## Step 7 — Seed the Database (Optional)

Full seed SQL for all 4 demo clients (JJ Roofing Group, Open Forge Construction, Acorns Roofing, Kaczmar Builders) is at the bottom of `/docs/database-schema.md` under **"Seed Data — 4 Demo Clients"**.

Copy that block and run it in the SQL Editor after creating the tables.

---

## Step 8 — Generate TypeScript Types (Optional but Recommended)

Once the schema is in place, replace the hand-written types in `/src/lib/supabase/types.ts` with auto-generated ones:

```bash
npx supabase login
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/supabase/types.ts
```

This keeps TypeScript types in sync with your actual schema.

---

## Fallback Behavior

The app is designed to work without Supabase at any time:

| Condition | Result |
|---|---|
| No Supabase env vars | Uses mock data provider — full app works |
| Supabase vars present, table empty | Supabase provider falls back to mock for empty results |
| Supabase vars present, connection error | Logs error, falls back to mock |
| Supabase vars present, table has data | Reads from database |

You can develop, demo, and test the entire app without a database connection.

---

## Environment Variables Reference

| Variable | Required | Exposure | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For DB mode | Browser + Server | Project URL from Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For DB mode | Browser + Server | Public anon key — safe in browser bundles |
| `SUPABASE_SERVICE_ROLE_KEY` | For server writes | Server only | Secret key — never expose in client code |

---

## Security Notes

- The service role key bypasses all Row Level Security (RLS). It must only be used in server-side route handlers (`/app/api/**`), never in client components.
- Enable RLS on all tables (the schema does this by default).
- For a multi-user deployment, add `auth.uid()` checks to all policies and associate records with user IDs.
- Rotate the service role key immediately if it is ever accidentally committed to git.
- The anon key has limited permissions and is safe to ship in the browser bundle.
