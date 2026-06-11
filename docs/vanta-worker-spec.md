# Vanta Worker — Queue Contract Spec (V1.4)

The Vanta Worker is an **external** media box (Hermes pattern: Mac Studio / GPU VPS) that
pulls processing jobs from `vanta_agent_runs` over HTTPS, runs the real media work
(ffmpeg, faster-whisper, PySceneDetect), and submits validated results back. The control
plane (this Next.js app) **never** runs heavy media work in a request handler and never
calls the worker synchronously.

## Invariants

- Worker routes are bearer-secret guarded and **fail closed**: when `VANTA_WORKER_SECRET`
  is unset (or under 16 chars) every worker route returns `503`.
- The worker never publishes, posts, launches ads, or contacts anyone — it transforms
  local media and writes artifacts/rows only.
- Completion payloads are validated per `job_type` server-side before any row is touched.
  Unknown fields are dropped. Invalid payloads mark the run `failed` and return `422`.
- `clips` jobs are **not worker-claimable**: clips/hooks are control-plane generated
  (deterministic rubric over transcript × scenes).
- Idempotency: one active job per `(asset_id, job_type, params_hash)` — repeat enqueues
  return the existing run.

## Environment

| Variable | Where | Purpose |
|---|---|---|
| `VANTA_WORKER_SECRET` | Vercel app + worker box | Bearer token for worker routes. ≥16 chars. Rotate by setting a new value in both places. |
| `VANTA_MEDIA_ROOT` | worker box (and optionally a dev box) | Directory containing source footage. Paths are resolved symlink-safe under this root only. |
| `VANTA_ALLOW_INLINE_HEAVY` | dev box only, `true` to enable | Lets the **admin smoke route** (`POST /api/vanta/jobs/[id]/run`) execute local whisper/scenedetect. Never set in production — heavy work belongs here, on the worker. |

## Auth

Every worker request sends:

```
Authorization: Bearer ${VANTA_WORKER_SECRET}
```

`401` = bad/missing token. `503` = contract disabled (secret unset server-side).
`413` = body over 2 MB (worker payloads are small JSON).

**Claim identity:** `claimed_by` in request bodies is a worker instance name (e.g.
`mac-studio-01`). On every claim the server issues a random `claim_token` and stores the
run's owner as `worker:{name}#{token}`. Heartbeat/complete/fail must present **both**
`claimed_by` and `claim_token` — the bearer secret alone cannot finalize another
worker's run (per-claim ownership, not just shared-secret trust). Tokens are redacted to
`worker:{name}` everywhere claimed_by leaves the server. App smoke runs are namespaced
`app:{user}` and can never collide with worker identities.

## Endpoints

### 1. Claim the next job

```bash
curl -s -X POST "$APP_URL/api/vanta/runs/claim" \
  -H "Authorization: Bearer $VANTA_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"claimed_by":"mac-studio-01","job_types":["probe","transcript","scenes","proxy","audio","thumbnail"]}'
```

- `200 { job, asset, claim_token }` — job claimed (CAS, oldest queued first). **Store
  `claim_token`** — it is required on every subsequent call for this job and is never
  re-issued. `asset.file_name` is the footage file the worker should locate under its
  own `VANTA_MEDIA_ROOT`.
- `200 { job: null }` — queue idle; sleep and poll again (suggested 5–15s).
- `job_types` is optional (defaults to all worker-claimable types). `clips` is ignored.

### 2. Heartbeat (every ≤60s while working)

```bash
curl -s -X POST "$APP_URL/api/vanta/runs/$JOB_ID/heartbeat" \
  -H "Authorization: Bearer $VANTA_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"claimed_by":"mac-studio-01","claim_token":"<from claim response>"}'
```

First heartbeat moves `claimed → running` and sets `started_at`; later ones touch
`updated_at`. A claimed/running job with no heartbeat for **10 minutes** is flagged
`stale` in the project jobs view (visibility only — no auto-reclaim in V1.4).
`409` = job is not yours or no longer active.

### 3. Complete

```bash
curl -s -X POST "$APP_URL/api/vanta/runs/$JOB_ID/complete" \
  -H "Authorization: Bearer $VANTA_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"claimed_by":"mac-studio-01","claim_token":"<from claim response>","result":{...per job_type, see schemas...}}'
```

`200 { job }` on success. `422` = payload failed validation (run is marked failed with
the reason — fix the worker, re-enqueue via the app). `409` = not yours / not active.

### 4. Fail

```bash
curl -s -X POST "$APP_URL/api/vanta/runs/$JOB_ID/fail" \
  -H "Authorization: Bearer $VANTA_WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"claimed_by":"mac-studio-01","claim_token":"<from claim response>","error":"ffprobe exited 1: moov atom not found"}'
```

Error text is capped at 500 chars.

## Result schemas (validated server-side; unknown fields dropped)

### `probe`
```jsonc
{
  "duration_ms": 312000, "width": 3840, "height": 2160, "fps": 29.97,
  "codec": "hevc", "audio_codec": "aac", "audio_channels": 2,
  "sample_rate_hz": 48000, "bit_rate": 85000000, "size_bytes": 3320000000,
  "format_name": "mov,mp4,m4a,3gp,3g2,mj2", "notes": []
}
```
Applies to `vanta_assets` (duration/resolution/fps/codec/probe, status → `probed`).
All numbers are clamped to sane ranges.

### `thumbnail` / `proxy` / `audio`
```jsonc
{
  "outputs": ["<asset_id>/thumb-1.jpg", "<asset_id>/thumb-2.jpg"],  // required, ≤12, ≤300 chars each
  "storage_bucket": "vanta-thumbnails",                              // optional
  "notes": ["..."]                                                   // optional, ≤8
}
```
Stored as the bounded run result (artifact paths follow `{asset_id}/{artifact}`).

### `transcript`
```jsonc
{
  "full_text": "…",                 // required, ≤100k chars
  "language": "en",
  "engine": "faster-whisper large-v3 int8",
  "segments": [                      // required ≥1, ≤400; text ≤1000 chars each
    { "start_ms": 0, "end_ms": 4200, "text": "Stop. Don't sign that yet.", "speaker": "owner" }
  ]
}
```
Creates/updates the asset's `vanta_transcripts` row with `source: "whisper"` and measured
segments (replacing any word-proportional estimates). After this lands, re-enqueue
processing in the app so the control-plane `clips` job rescores against measured timing.

### `scenes`
```jsonc
{
  "scenes": [                        // required ≥1, ≤60
    { "start_ms": 0, "end_ms": 8125, "kind": "talking_head", "detector": "pyscenedetect ContentDetector t=27", "thumb_path": "<asset_id>/scene-1.jpg" }
  ]
}
```
Replaces the asset's `vanta_scenes` rows. `kind` must be one of
`talking_head | b_roll | drone | site | unknown` (anything else → `unknown`).

## Worker loop (reference pseudocode)

```text
forever:
  job = POST /runs/claim {claimed_by}
  if job is null: sleep 10s; continue
  start heartbeat timer (POST /runs/{id}/heartbeat every 45s)
  try:
    locate file under local VANTA_MEDIA_ROOT by asset.file_name
    run the media tool for job.job_type (argv plans for each type ship in prior
    inline-run results and in src/lib/vanta/media/*.ts)
    POST /runs/{id}/complete {claimed_by, result}
  catch e:
    POST /runs/{id}/fail {claimed_by, error: str(e)[:500]}
  finally: stop heartbeat
```

## Verification (control plane)

```bash
npx tsc --noEmit
pnpm build
# hermes-qa loop (build/typecheck/security scan + Codex review)
# Unauth → 401/503 checks:
curl -s -o /dev/null -w "%{http_code}\n" -X POST $APP_URL/api/vanta/runs/claim                      # 503 (secret unset) or 401 (no bearer)
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Authorization: Bearer wrong" $APP_URL/api/vanta/runs/claim  # 401
```

The mock worker lifecycle (claim → heartbeat → complete with valid and invalid payloads →
fail, plus ownership 409s) is exercised in the V1.4 QA session via the in-memory store.
