# Vault Co — Supabase Storage Setup

## Overview

Vault Co uses a file storage abstraction (`src/lib/storage/storage-provider.ts`) that routes to either:
- **Mock provider** — in-memory, session-only, always works locally
- **Supabase Storage** — real file persistence (connected when env vars are present)

The app runs fully without Supabase Storage. All pages degrade gracefully to mock mode.

---

## Required Supabase Storage Buckets

Create these buckets in your Supabase project under **Storage → Buckets**.

| Bucket Name          | Access     | Max File Size | Purpose |
|----------------------|------------|---------------|---------|
| `client-files`       | Private    | 50 MB         | General client docs: contracts, notes, misc assets |
| `creative-assets`    | Private    | 200 MB        | Ad creative images and videos |
| `onboarding-summaries` | Private  | 20 MB         | Onboarding PDF uploads (per client) |
| `reports`            | Private    | 20 MB         | Weekly/monthly performance reports |

---

## File → Bucket Mapping

The `ClientFile.category` field determines which bucket a file goes into:

| `category`            | Bucket                  |
|-----------------------|-------------------------|
| `onboarding_summary`  | `onboarding-summaries`  |
| `creative_asset`      | `creative-assets`       |
| `contract`            | `client-files`          |
| `report`              | `reports`               |
| `client_asset`        | `client-files`          |
| `other`               | `client-files`          |

---

## Storage Path Convention

Files should be stored under a client-scoped path to prevent ID collisions:

```
{bucket}/{clientId}/{timestamp}_{fileName}
```

Examples:
```
client-files/kaczmar-builders/1746201234567_contract_2026.pdf
creative-assets/jj-roofing-group/1746201234568_phoenix_storm_reel.mp4
onboarding-summaries/acorns-roofing/1746201234569_intake_notes.pdf
```

---

## Recommended RLS Policies

Apply these Row Level Security policies after creating each bucket. Replace `your_role` with `service_role` for server-side operations.

### `client-files` bucket

```sql
-- Allow authenticated users to read files for their assigned clients
create policy "Authenticated read client-files"
  on storage.objects for select
  using (bucket_id = 'client-files' and auth.role() = 'authenticated');

-- Allow service role full access (server-side uploads)
create policy "Service role full access client-files"
  on storage.objects
  using (auth.role() = 'service_role');
```

### `creative-assets` bucket

```sql
create policy "Authenticated read creative-assets"
  on storage.objects for select
  using (bucket_id = 'creative-assets' and auth.role() = 'authenticated');

create policy "Service role full access creative-assets"
  on storage.objects
  using (auth.role() = 'service_role');
```

Apply the same pattern for `onboarding-summaries` and `reports`.

---

## How to Connect Storage

### Step 1 — Add environment variables

In `.env.local`, ensure these are set (same vars as the database):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 2 — Create buckets

In Supabase Dashboard → Storage → New Bucket. Create all four buckets listed above. Set each to **Private** (not public).

### Step 3 — Apply RLS policies

In Supabase Dashboard → Storage → Policies, apply the policies above for each bucket.

### Step 4 — Implement SupabaseStorageProvider

The placeholder lives at `src/lib/storage/storage-provider.ts`. When ready to implement real storage, create `src/lib/storage/supabase-storage-provider.ts` implementing the `StorageProvider` interface:

```ts
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { StorageProvider } from "./storage-provider";
import type { ClientFile } from "./types";

function getBucket(category: ClientFile["category"]): string {
  if (category === "onboarding_summary") return "onboarding-summaries";
  if (category === "creative_asset") return "creative-assets";
  if (category === "report") return "reports";
  return "client-files";
}

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase" as const;

  async saveFile(file: ClientFile): Promise<ClientFile> {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase not configured");
    const bucket = getBucket(file.category);
    const path = `${file.clientId}/${Date.now()}_${file.fileName}`;
    // Upload actual bytes via supabase.storage.from(bucket).upload(path, fileBlob)
    // Then insert metadata row in client_files table
    // Return file with updated storageUrl
    return { ...file, storageUrl: `${bucket}/${path}` };
  }

  // Implement remaining methods following the same pattern
}
```

### Step 5 — Update the factory

In `storage-provider.ts`, replace the mock fallback with the real provider when Supabase is configured:

```ts
if (hasSupabase) {
  const { SupabaseStorageProvider } = require("./supabase-storage-provider");
  _provider = new SupabaseStorageProvider();
}
```

---

## Mock Fallback Behavior

When Supabase env vars are absent (local dev, CI, etc.):
- `getStorageProvider()` returns `MockStorageProvider`
- All pages show a "Mock storage mode" badge
- File metadata is saved in-memory for the session
- File bytes are never actually stored (no uploads happen)
- Seeded mock files appear in the Client Files tab for Kaczmar Builders, JJ Roofing, Acorns Roofing, and Open Forge

This means the full UI is functional — upload modals, file lists, category filters, and delete — without any backend dependency.

---

## `client_files` Database Table

The file metadata (not the actual bytes) is stored in Supabase Postgres alongside the storage URL:

```sql
create table client_files (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null references clients(id) on delete cascade,
  file_name    text not null,
  file_type    text not null,
  file_size    bigint not null default 0,
  mime_type    text not null default '',
  category     text not null default 'other',
  storage_url  text not null,
  thumbnail_url text,
  uploaded_by  text not null,
  uploaded_at  timestamptz not null default now(),
  notes        text not null default '',
  status       text not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_client_files_client_id on client_files(client_id);
create index idx_client_files_category on client_files(category);

alter table client_files enable row level security;
```

Add this table definition to `docs/database-schema.md` before running in Supabase.
