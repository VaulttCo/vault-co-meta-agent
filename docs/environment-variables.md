# Environment Variables

All environment variables for the Vault Co portal. Set these in `.env.local` for local development, and in Vercel's Environment Variables panel for production.

## AI Provider

| Variable | Required | Description |
|---|---|---|
| `AI_PROVIDER` | No (default: `mock`) | Which AI provider to use: `mock`, `anthropic`, or `openai` |
| `ANTHROPIC_API_KEY` | When `AI_PROVIDER=anthropic` | Anthropic API key — get from console.anthropic.com |
| `OPENAI_API_KEY` | When `AI_PROVIDER=openai` | OpenAI API key — get from platform.openai.com |

**Fallback behavior:** The app always falls back to mock mode if the provider key is absent or the API call fails. A "Veronica is running in mock mode" notice appears in the Campaign Builder.

## Supabase

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No | Your Supabase project URL — from Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anon (public) key — from Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key — **server-side only, never expose to browser** |

## Credential Encryption

| Variable | Required | Description |
|---|---|---|
| `CREDENTIAL_ENCRYPTION_KEY` | When using per-client credentials | 64-character hex string (32 bytes / 256 bits). Used by AES-256-GCM to encrypt Meta and GHL API credentials before storing them in Supabase. If absent, `/api/integrations/credentials/save` returns 503. |

Generate a key:

```bash
openssl rand -hex 32
```

**Security rules:**
- Never commit this key to git — it is the master decryption key for all per-client credentials
- Never name it `NEXT_PUBLIC_*` — it must remain server-side only
- If the key is rotated, all previously saved credentials must be re-entered (they were encrypted with the old key)
- All encryption and decryption happens exclusively in `src/lib/crypto/credentials.ts` on the server

**Fallback behavior:** When Supabase vars are absent, the app uses in-memory mock data. The Settings page shows which provider is active.

**Security note:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must only be used in route handlers (`src/app/api/**`). Never reference it in client components or files without `// Server-side` in the header comment. It intentionally does not start with `NEXT_PUBLIC_`.

## Supabase Storage

Supabase Storage uses the same `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` variables as the database. No additional storage-specific variables are needed.

When storage is not configured, file uploads are accepted but not persisted. A "Mock storage mode active" notice appears in Settings.

## Example `.env.local`

```bash
# AI — pick one provider or leave as mock
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase — leave blank to run fully on mock data
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Credential encryption — required for per-client Meta/GHL credential storage
# EXAMPLE ONLY — do not use this value. Generate a real key with:
#   openssl rand -hex 32
CREDENTIAL_ENCRYPTION_KEY=<your-64-char-hex-key>
```

## What runs in mock mode by default

| System | Mock when | Notice shown |
|---|---|---|
| AI (Veronica) | `AI_PROVIDER=mock` or key missing | "Veronica is running in mock mode" in Campaign Builder |
| Data (clients, drafts, reports) | Supabase URL/key missing | "Mock data mode active" in Settings |
| Storage (file uploads) | Supabase URL/key missing | "Mock storage mode active" in Settings |
| Auth | Always (demo auth, no Supabase Auth yet) | "Demo auth mode active" in Settings |

## Variables that must NOT be in git

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CREDENTIAL_ENCRYPTION_KEY` — master key for all per-client credentials; rotation requires re-entering all saved credentials
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (technically public, but still keep out of source control)

`.env.local` is in `.gitignore`. Never commit it. If a key is accidentally committed, rotate it immediately in the respective provider's console.
