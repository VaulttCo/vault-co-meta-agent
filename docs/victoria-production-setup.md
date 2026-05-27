# Victoria AI Sales Coach — Production Setup Checklist

Complete this checklist in order before using Victoria in a live call.

---

## Step 1 — Run the Database Schema

In your Supabase project, open the **SQL Editor** and run:

```
docs/victoria-schema.sql
```

**Order matters — run only once per project:**

1. The script creates:
   - `victoria_prospects` — persistent prospect intelligence
   - `victoria_calls` — one row per call session
   - `victoria_transcript_chunks` — every spoken segment
   - `victoria_coaching_events` — every coaching card generated
   - `victoria_objection_events` — every objection detected and analyzed
   - `victoria_deal_scores` — periodic risk snapshots
   - `victoria_agent_outputs` — raw agent output log (debugging + future fine-tuning)
   - `victoria_post_call_debriefs` — post-call debrief reports
   - `victoria_knowledge_base` — RAG knowledge store (requires pgvector)
   - `victoria_prospect_memory_snapshots` — cross-call intelligence
   - `victoria_call_summary` — dashboard view

2. The script requires **pgvector** — it runs `CREATE EXTENSION IF NOT EXISTS vector` at the top. This is available on all Supabase plans. If you get an error, enable pgvector in your project settings under **Database → Extensions**.

3. The `victoria_knowledge_base` table includes a `VECTOR(1536)` column. If you don't need semantic KB search yet, the table will still create successfully — just don't index it until you have content.

4. Row Level Security (RLS): The script does **not** enable RLS on Victoria tables. Victoria uses the service role key (`SUPABASE_SERVICE_ROLE_KEY`) via the server-side client, which bypasses RLS. If you enable RLS later, ensure the service role still has full access.

---

## Step 2 — Set Environment Variables

Add to `.env.local` (local dev) and to Vercel Environment Variables (production):

### Required for Victoria to fully function

| Variable | Where to get it | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) | Required for AI coaching. Without it, Victoria uses deterministic mock outputs — still produces coaching cards but from templates, not live AI. |
| `UPSTASH_REDIS_REST_URL` | [console.upstash.com](https://console.upstash.com) → Create database → REST URL | Required for live call session state. Without it, session state is in-memory per process — works in dev, breaks on Vercel (serverless = no shared memory). |
| `UPSTASH_REDIS_REST_TOKEN` | Same Upstash dashboard → REST Token | Must accompany `UPSTASH_REDIS_REST_URL`. |

### Required for live audio transcription

| Variable | Where to get it | Notes |
|---|---|---|
| `ASSEMBLYAI_API_KEY` | [app.assemblyai.com](https://app.assemblyai.com) | **Server-side only — never prefix with `NEXT_PUBLIC_`.** Without it, Victoria falls back to Web Speech API (Chrome-only, lower accuracy). |

### Already set (shared with Veronica)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Used for Supabase data persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Used for client-side Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | Used by Victoria's server-side DB helpers |

---

## Step 3 — Upstash Redis Setup

1. Go to [console.upstash.com](https://console.upstash.com)
2. Click **Create Database**
3. Name: `vault-co-victoria` (or any name)
4. Region: choose closest to your Vercel deployment region
5. Type: **Regional** (not Global — Global is for edge use cases)
6. Copy **REST URL** → `UPSTASH_REDIS_REST_URL`
7. Copy **REST Token** → `UPSTASH_REDIS_REST_TOKEN`

Victoria uses a 6-hour TTL per session key (`victoria:session:{call_id}`). A typical call with 50 chunks uses < 50KB of Redis storage.

---

## Step 4 — AssemblyAI Setup

1. Create account at [assemblyai.com](https://www.assemblyai.com)
2. Go to **API Keys** in your dashboard
3. Copy your API key → `ASSEMBLYAI_API_KEY`

Victoria uses AssemblyAI's **real-time streaming transcription** over WebSocket.

The flow:
- Browser requests `/api/victoria/transcription/token`
- Server exchanges your AssemblyAI key for a **short-lived token** (1 hour TTL)
- Browser uses the token to open a WebSocket directly to AssemblyAI
- **Your API key never leaves the server**

AssemblyAI billing: real-time transcription is billed per minute of audio. A 30-minute sales call ≈ $0.60 at current rates.

If `ASSEMBLYAI_API_KEY` is not set, Victoria falls back to the **Web Speech API** (Chrome only, no billing, lower accuracy). The fallback is fully functional for testing.

---

## Step 5 — Vercel Environment Variable Configuration

In your Vercel project:

1. Go to **Settings → Environment Variables**
2. Add each variable with **Environment = Production + Preview**
3. Set `ASSEMBLYAI_API_KEY` — **do not** check "Expose to browser"
4. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
5. Confirm `ANTHROPIC_API_KEY` is present (shared with Veronica)
6. Redeploy after adding variables

---

## Step 6 — Smoke Test After Deploy

Run these requests against your production URL:

```bash
# 1. Start a test session
curl -X POST https://your-app.vercel.app/api/victoria/test-call \
  -H "Content-Type: application/json" \
  -d '{"action":"start","prospect":{"name":"Test Prospect","company":"Test Roofing","vertical":"roofing"}}'

# 2. Submit a pain chunk (use the call_id from step 1)
curl -X POST https://your-app.vercel.app/api/victoria/test-call \
  -H "Content-Type: application/json" \
  -d '{"action":"chunk","call_id":"<from_step_1>","speaker":"prospect","text":"Our leads have been really inconsistent. Some months are great, other months it is just dead."}'

# 3. Check transcription provider (should show assemblyai if key is set)
curl https://your-app.vercel.app/api/victoria/transcription/token
```

**Expected results:**
- Step 1: `{"success":true,"call_id":"test_..."}` — session created
- Step 2: `{"coaching_card":{...},"processing_time_ms":<50}` — coaching card generated
- Step 3: `{"available":true,"provider":"assemblyai","token":"..."}` if AssemblyAI key is set; `{"available":false,"provider":"web_speech_api"}` if not

---

## Fallback Behavior Reference

| Missing variable | Behavior | Production impact |
|---|---|---|
| `ANTHROPIC_API_KEY` | Mock coaching cards from templates | Coaching still works — lower quality |
| `UPSTASH_REDIS_REST_URL/TOKEN` | In-memory session store | **Sessions lost between requests on Vercel** — must set for production |
| `ASSEMBLYAI_API_KEY` | Web Speech API fallback | Chrome-only, lower accuracy |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase inserts silently skipped | No call history persisted |

---

## Architecture Summary

```
Browser mic → /api/victoria/transcription/token (gets short-lived AssemblyAI token)
           → AssemblyAI WebSocket (real-time transcription)
           → /api/victoria/chunks (every 5-15 seconds)
                → Orchestrator → [Discovery Agent + Objection Agent + Deal Risk Agent + Emotional Agent]
                               → Coaching Card Builder
                               → Redis (live session state)
                               → Supabase (persistent history)
           → Coaching card displayed to rep instantly
```
