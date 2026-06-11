# VANTA — Creative Intelligence Module · Master Architecture & Build Plan

Vanta is Vault Co's AI Creative Director: footage intelligence, color grading, editing,
captions, hooks, thumbnails, sound design, QA, and performance learning — built as a
**first-class Vault Core module**, not a separate app, brand, or design language.

**Placement in the ecosystem (decided, non-negotiable):**

| System | Role | Runtime status |
|---|---|---|
| Veronica | Marketing Intelligence | Vault Core executive (active 6) |
| Victoria | Sales Intelligence | Product surface (NOT a runtime executive) |
| Hermes | Operations Intelligence | External VPS worker, text-only |
| Vault Core | Company OS | 6 active executives, tick, approvals |
| **Vanta** | **Creative Intelligence** | **Product surface, Victoria pattern** |

Vanta follows the **Victoria precedent**: a multi-agent product surface at
`src/lib/vanta/**` + `/vanta` + `/api/vanta/**`. Its agents are library-level AI roles —
they are **NOT added to the Vault Core runtime roster** (which stays exactly
vega/veronica/valentina/valerie/vanessa/vivian) and do **NOT** run on the tick. Vanta
feeds Vault Core through the existing draft lanes (creative briefs, recommendations)
rather than duplicating them.

---

## 1. Complete architecture — three planes

```
┌─────────────────────────────────────────────────────────────────────┐
│ CONTROL PLANE — Next.js (this repo, Vercel)                         │
│  /vanta UI · /api/vanta routes · orchestration · review/approval    │
│  scoring display · memory center · role-guarded · mock-safe         │
├─────────────────────────────────────────────────────────────────────┤
│ INTELLIGENCE PLANE — Anthropic API (existing raw-fetch pattern)     │
│  Strategist · Hook · Editor-plan · Caption-style · Color-reasoning  │
│  Sound-design · Thumbnail-concept · QA — structured tool-call JSON  │
│  with deterministic mock fallback (app fully functional w/o keys)   │
├─────────────────────────────────────────────────────────────────────┤
│ MEDIA PLANE — Vanta Worker (Hermes-pattern VPS / local Mac)         │
│  ffmpeg · faster-whisper · PySceneDetect · claude-code-video-toolkit│
│  remotion render farm · pulls jobs from vanta_agent_runs queue,     │
│  writes artifacts to Supabase Storage + rows to vanta_* tables.     │
│  NEVER called synchronously from a Vercel route.                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Why:** ffmpeg/whisper/scene-detection cannot run inside Vercel serverless at production
scale (binary size, 60s+ jobs, GPU for whisper-large). The proven in-house pattern is
Hermes: an external worker with a strict job contract, status polling, and Supabase as the
single source of truth. The control plane never blocks on media work — it enqueues a job
and renders whatever artifacts exist.

**Job contract (`vanta_agent_runs`):** `{ id, project_id, asset_id, agent, job_type,
status: queued|claimed|running|succeeded|failed, params jsonb, result jsonb, error,
claimed_by, started_at, finished_at }`. Worker long-polls `status=queued`, claims with
compare-and-set (same CAS discipline as draft reviews), heartbeats `updated_at`, writes
results. Idempotent per `(asset_id, job_type, params_hash)`.

---

## 2. Repo recommendations (evaluated 2026-06-10)

| Repo | Stars | Last push | Verdict |
|---|---|---|---|
| `digitalsamba/claude-code-video-toolkit` | 1,408 | today | **ADOPT** — core of the Vanta Worker. AI-native ffmpeg/whisper/scene pipeline driven by Claude Code. |
| `samuelgursky/davinci-resolve-mcp` | 1,207 | today | **ADOPT (finishing station)** — pro color/conform handoff on the edit workstation. Requires Resolve Studio. |
| `microsoft/playwright-mcp` | 33,727 | today | **ADOPT** — competitor ad research + thumbnail CTR reference capture (internal research only). |
| `remotion-dev/remotion` | 49,615 | today | **ADOPT** — motion-graphics templates, caption burn-in, overlay packs as React components rendered by the worker. |
| `SYSTRAN/faster-whisper` | 23,523 | active | **ADOPT** — transcription engine inside the worker (int8 on CPU, fp16 on GPU). |
| `Breakthrough/PySceneDetect` | 4,914 | today | **ADOPT** — scene/cut detection inside the worker (ContentDetector + AdaptiveDetector). |
| `KyaniteLabs/mcp-video` | 35 | active | **EVALUATE** — guardrailed ffmpeg MCP; nice safety model, small community. Use as reference for worker guardrails. |
| `ayushozha/AdobePremiereProMCP` | 32 | 2026-03 | **DEFER** — stale 3 months, Premiere not in the Vault stack; Resolve covers finishing. |

**Tool landscape distilled (what we're internalizing):** Opus Clip → clip scoring + auto
shorts + virality score; Descript → transcript-as-edit-surface (our edit plans are
transcript-anchored); Captions AI → styled caption systems; Runway/Veo → generative B-roll
(Phase 3); HeyGen/Arcads → avatar ads (out of scope, conflicts with authenticity-first
roofing content); MrBeast/Hormozi workflows → retention-first pacing, 3-second hook rule,
pattern interrupts every 15–30s, caption emphasis economics — encoded in agent prompts.

## 3. MCP recommendations

Document-first, install-on-demand (MCPs attach to the **editing workstation / worker**,
not the Vercel app):

| MCP | Where | Purpose | Install |
|---|---|---|---|
| Filesystem | workstation | footage tree access | bundled with Claude Code |
| GitHub | workstation | repo ops | `claude mcp add github` |
| Playwright | workstation | ad/competitor research | `claude mcp add playwright -- npx @playwright/mcp@latest` |
| DaVinci Resolve | edit bay | timeline/color conform | per repo README (Resolve Studio + Python API) |
| Video toolkit | worker | ffmpeg/whisper pipeline | clone `claude-code-video-toolkit`, `pip install -r requirements` |
| Supabase | worker | DB/storage from worker | service-role key, worker env only |
| Memory | workstation | session continuity | optional |

Premiere MCP: deferred (stale). FFmpeg access: through the video toolkit (guardrailed),
not a raw ffmpeg MCP.

---

## 4. Folder structure

```
src/lib/vanta/
  types.ts               # all entities + enums (single source of truth)
  db.ts                  # mock-safe data layer (Supabase service-role, CAS reviews)
  ai.ts                  # server-only Anthropic tool-call caller (Victoria pattern)
  scoring.ts             # deterministic clip/hook/quality scoring rubrics
  analyze.ts             # orchestrates the intelligence-plane analysis run
  agents/
    registry.ts          # 9 agent definitions (id, mission, inputs, outputs)
    prompts.ts           # system prompts + tool schemas per agent
  color/
    presets.ts           # 5 signature grades + detection heuristics + per-NLE recipes
  sound/
    taxonomy.ts          # SFX/music taxonomy, packs, auto-sound-design rules
  packs/
    content-packs.ts     # Roofing / Testimonial / Authority / Viral Reel packs
src/app/vanta/
  page.tsx               # hub
  projects/page.tsx      # project list
  projects/[id]/page.tsx # workbench (pipeline + agent outputs)
  upload/ color-lab/ timeline/ hook-lab/ caption-lab/ thumbnail-lab/ qa/ memory/
src/app/api/vanta/
  projects/route.ts  projects/[id]/route.ts  projects/[id]/analyze/route.ts
  assets/route.ts  runs/route.ts  memory/route.ts
docs/
  vanta-master-plan.md   # this file
  vanta-schema.sql       # 15 tables + RLS + indexes
  vanta-worker-spec.md   # (Phase 1.2) worker contract + install
```

## 5. Database schema — `docs/vanta-schema.sql`

15 tables: `vanta_projects` (campaign/project container, industry, objective, status) →
`vanta_assets` (raw footage/audio/image refs, storage paths, probe metadata) →
`vanta_scenes` (detector output, start/end ms, kind) → `vanta_clips` (scored moments,
1–100, hook/highlight/dead-space flags) → `vanta_transcripts` (segments jsonb, language,
source) → `vanta_color_grades` (detected condition + chosen preset + per-NLE recipe +
consistency score) → `vanta_edit_plans` (timeline json, story beats, pacing, sound design
cue sheet, export targets) → `vanta_hooks` (variant text/clip ref, 3s score, pattern
interrupt type) → `vanta_captions` (SRT/VTT payloads, style spec) → `vanta_thumbnails`
(concepts, layout spec, predicted CTR rank) → `vanta_exports` (deliverables, target,
status) → `vanta_scores` (entity-typed score events) → `vanta_memory` (winning patterns,
learn-loop) → `vanta_agent_runs` (job queue + audit) → `vanta_performance` (Meta/GHL
results joined back to creatives). All RLS-on/no-policies (service-role only), indexed on
project/asset/status/type/created_at, FK relationships project→asset→scene/clip/etc.

## 6. Storage architecture

Supabase Storage buckets (private, service-role; signed URLs for UI playback):
`vanta-raw-footage` (originals) · `vanta-proxies` (720p h264 review proxies) ·
`vanta-transcripts` (srt/vtt/json) · `vanta-thumbnails` · `vanta-captions` ·
`vanta-color-previews` (before/after stills) · `vanta-edits` (timeline XML/EDL/OTIO) ·
`vanta-exports` (finals). Worker writes; app reads via signed URLs. Path convention:
`{bucket}/{project_id}/{asset_id}/{artifact}`. Upload: browser → tus resumable (tus-js-client
already in deps) or signed upload URL → `vanta-raw-footage`; worker picks up via queue.

## 7. API architecture

All routes `resolveServerRole` + role-guarded, `runtime=nodejs`, `dynamic=force-dynamic`,
mock-safe, DTO-sanitized:

```
GET/POST  /api/vanta/projects              list + create
GET/PATCH /api/vanta/projects/[id]         detail + status/notes
POST      /api/vanta/projects/[id]/analyze run intelligence-plane analysis (real AI, mock fallback)
GET/POST  /api/vanta/assets                register asset (metadata + transcript paste/import)
GET       /api/vanta/runs                  job queue status (worker heartbeat visibility)
GET       /api/vanta/memory                winning-pattern memory
POST      /api/vanta/runs/[id]/claim       (worker-only, bearer VANTA_WORKER_SECRET) Phase 1.2
POST      /api/vanta/runs/[id]/complete    (worker-only) Phase 1.2
```

Request/response schemas + TS types live in `src/lib/vanta/types.ts` (single source).

## 8. Agent architecture & prompts (9 agents, library-level)

| Agent | Plane | Inputs | Outputs |
|---|---|---|---|
| Creative Strategist | AI | project brief, industry KB, memory | creative brief, campaign concepts, content plan, hook bank |
| Footage Intelligence | Worker+AI | probe data, scenes, transcript | clip scores 1–100, highlights, dead space, talking-head map |
| Color Grading | Worker+AI | probe stats, frame samples | detected condition, preset choice, ffmpeg/Resolve/Premiere recipe, consistency score |
| Editor | AI | clips, transcript, strategy | timeline plan (transcript-anchored), story beats, pacing, zoom/B-roll calls, XML/JSON export spec |
| Caption | Worker+AI | transcript | SRT/VTT, styled caption spec, emphasis map, burn-in recipe |
| Hook Intelligence | AI | first-15s transcript+clips | 3s scores, alternates, pattern interrupts |
| Thumbnail | AI | clips, hooks, brand kit | concepts, layout spec, text options, CTR ranking |
| Sound Design | AI | edit plan, taxonomy | cue sheet (timestamped SFX), music brief (genre/energy/tempo/mood), mix notes |
| QA | AI | edit plan + artifacts | quality score 1–100, revision notes |
| Performance Intelligence | AI | vanta_performance + Meta/GHL aggregates | winners/losers, insights → vanta_memory |

Prompts: per-agent system prompt + **Anthropic tool-call schema** (structured JSON, no
parse errors) in `agents/prompts.ts`. Every agent prompt embeds the roofing/home-services
knowledge block and the retention rules (3s hook, 15–30s pattern interrupts, caption
emphasis, CTA placement).

## 9–10. UI & component architecture

Native Vault Core: `VCPageWrapper/VCPanel/VCStatusBadge/VCChip/VCButton/VCEmptyState`,
PageHeader, dark premium tokens, Rajdhani headings — zero new design language. Sidebar
gains a **Vanta** portal section (like Victoria). Pages in build order: hub → projects →
workbench (project detail = pipeline rail + agent output panels + scoreboard) → upload →
labs (color/hook/caption/thumbnail/qa/timeline/memory) as the workbench panels graduate to
dedicated pages. Components: `VantaPipelineRail`, `ClipScoreboard`, `ColorLabCompare`
(before/after slider), `HookLabBoard`, `CueSheet`, `QAScorecard`, `MemoryGrid`.

## 11. Deployment plan

1. Run `docs/vanta-schema.sql` in Supabase SQL editor (rerun-safe). 2. Create the 8
buckets (private). 3. Env: `ANTHROPIC_API_KEY` (existing), `VANTA_WORKER_SECRET` (Phase
1.2). 4. Vercel deploy (no new infra for control plane). 5. Worker box (Mac Studio or
Hetzner GPU VPS): install ffmpeg, `pip install faster-whisper scenedetect`, clone
`claude-code-video-toolkit`, configure Supabase service key, run `vanta-worker` poll loop.
6. Resolve MCP on the edit bay. Monitoring: `vanta_agent_runs` is the heartbeat — the
/vanta hub shows queue depth, stuck jobs (claimed > 10min), failure rate. Testing:
tsc/build/hermes-qa/codex + fixture footage through the worker. Scaling: workers are
stateless pollers — add boxes; whisper batch on GPU; proxies at 720p.

## 12. MVP (Phase 1 — control + intelligence planes, REAL today)

1 Create project → 2 register asset (+ optional transcript paste/import) → 3 run analysis
→ Strategist/Hook/Editor/Color/Sound/Caption-style/QA agents produce persisted, scored
artifacts (real Anthropic when key present, deterministic mock otherwise) → 5 workbench
displays everything. Steps 3–7 of the upload pipeline (proxy/audio/whisper/scenes) land
with the worker in Phase 1.2 — the data model, queue, and UI for them ship now.

## 12.1 Status — V1.2–V1.5 (built 2026-06)

V1.2 media foundation (ffmpeg/ffprobe detection, job queue over `vanta_agent_runs`,
auto-enqueued asset pipeline, processing routes + UI) · V1.3 transcription & scene
intelligence (whisper/derived/planned transcript tiers, `vanta_scenes` population,
deterministic clips/hooks/dead-space rubric in `scoring.ts`, Footage Intelligence panel)
· V1.4 worker contract hardening (bearer + per-claim-token guarded
claim/heartbeat/complete/fail under `/api/vanta/runs`, validated completion payloads,
stale visibility, `docs/vanta-worker-spec.md`) · V1.5 local worker runtime
(`scripts/vanta-worker.mjs` — fixture contract-QA mode + real media mode).
**Next unblocked step:** run the schema + stand up the worker box against a real
Supabase project (claim → real whisper/scenes → measured clips), then Phase 2 labs.

## 13. Phase 2 — auto production
Worker live: auto proxies, whisper, scene detect, ffmpeg color pass, auto clips → auto
shorts (9:16 crops via face tracking), remotion caption burn-in + motion-graphics packs,
auto thumbnails (frame pulls + layout render), auto ad variants (hook × CTA matrix),
social packages (Reels/Shorts/TikTok specs), export center.

## 14. Phase 3 — autonomous creative engine
Upload → finished campaign assets with minimal touch: performance loop (Meta CTR/CPL/
watch-time + GHL appointments + closed revenue → `vanta_performance` → memory → next
briefs), generative B-roll (Veo/Runway) where authentic footage gaps exist, auto variant
retirement/promotion, Vault Core handoff: approved Vanta outputs become creative-brief +
meta-campaign-draft lane items (existing approval gates — Vanta never launches anything).

## 15–18. Exact orders

**Code generation order:** types → schema SQL → db → color presets → sound taxonomy →
packs → scoring → agents (registry, prompts) → ai caller → analyze orchestrator → API
routes → sidebar → hub → projects → workbench → labs → worker spec → worker.
**Build order:** lib → api → ui → docs → verify (tsc, build, hermes-qa, codex) — the
standing Vault Core order. **Testing order:** tsc → build → hermes-qa → codex read-only →
route smoke (307/401 guards) → mock-mode walkthrough (create→analyze→review) → live-key
analysis → schema apply → worker fixture run. **Launch order:** ship control+intelligence
planes (internal) → run schema → first real project in mock+live AI → stand up worker →
Phase 2 labs → performance loop → Phase 3 autonomy.

---

# Sound Design & Media Asset Engine (mandatory)

**Sound Design Agent** (in `sound/taxonomy.ts` + agent prompt): audio analysis flags (poor
mic, background/wind noise, echo, clipping, volume inconsistency, long pauses, dead air —
detected by worker loudness/spectral pass, reasoned by AI) → recommendations (noise
reduction, EQ, compression, voice enhancement, −14 LUFS social / −16 LUFS ads loudness
normalization).

**SFX taxonomy** (searchable, categorized): UI (clicks, toggles, notifications, success,
loading) · Motion (whooshes, swipes, transitions, reveals, impacts, hits, risers) · Social
(pops, ticks, bounces, emphasis, viral-reel FX) · Business (premium/luxury UI, dashboard,
tech) · Construction/Roofing (hammer, nail gun, drone, tools, site ambiance).

**Music intelligence:** per-video recommendation of energy/genre/tempo/mood across
Authority, Luxury, Educational, Testimonial, Emotional, High Energy, Corporate,
Construction, Roofing categories.

**Asset library:** central registry (music, SFX, LUTs, motion graphics, lower thirds,
logos, brand kit, B-roll, drone, stock) — `vanta_assets.asset_kind` covers all; library
views filter by kind. **Asset sources:** connector design for Artlist, Epidemic Sound,
Motion Array, Envato Elements, Storyblocks, Adobe Stock — license-aware pull-through
(Phase 2; API/browser-automation per source; assets land in the library with license
metadata).

**Motion graphics system:** remotion template registry — hook animations, CTA animations,
testimonial cards, before/after transitions, statistics/revenue/appointment/missed-call
overlays, Veronica/Vanta brand overlays.

**Content packs:** Roofing Pack (transitions, SFX, lower thirds, CTA anims, Roofing
Authority LUT) · Testimonial Pack (trust graphics, warm grade) · Authority Pack
(educational overlays, stat graphics, expert callouts) · Viral Reel Pack (fast cuts, viral
transitions, social SFX).

**Auto sound design:** every edit plan ships a timestamped cue sheet
(`0:00 Click · 0:02 Impact · 0:04 Whoosh · …`) generated against the taxonomy, plus the
one-glance creative card (Hook clip / Sound / Transition / Caption style / Music track /
Color LUT / Thumbnail concept) — how top short-form teams brief editors.

---

## Safety & invariants (unchanged, permanent)

Vanta agents are NOT Vault Core executives (roster stays exactly 6; no tick changes).
Vanta never launches ads, never posts/publishes/uploads to social, never contacts clients,
never mutates GHL/Stripe/Meta — finished assets flow into the EXISTING creative-brief /
meta-campaign-draft approval lanes. Worker is external (Hermes pattern), bearer-secret
guarded, never synchronously invoked from the app. All tables RLS-on/no-policies. Mock
fallback mandatory everywhere.
