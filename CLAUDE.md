@AGENTS.md

# Vault Co — Meta Ads AI Agent

Next.js 16 dashboard for AI-powered Meta advertising management.

## Stack

- **Framework**: Next.js 16 (App Router, `src/` directory, `@/*` alias)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first config in `globals.css`)
- **Icons**: lucide-react
- **AI**: Anthropic Claude API (claude-sonnet-4-6)

## Project structure

```
src/
  app/
    layout.tsx          # Root layout with Sidebar + Topbar shell
    page.tsx            # Dashboard overview
    campaigns/page.tsx  # Campaign management
    analytics/page.tsx  # Analytics & reporting
    audiences/page.tsx  # Audience targeting
    creatives/page.tsx  # Ad creative assets
    ai-agent/page.tsx   # AI Agent chat console
    settings/page.tsx   # Integrations & config
    globals.css         # Tailwind v4 theme tokens + base styles
  components/
    layout/
      Sidebar.tsx       # Left nav with Vault Co branding
      Topbar.tsx        # Top header with page title + actions
    ui/
      StatCard.tsx      # KPI metric card
      Badge.tsx         # Status/type pill
      PageHeader.tsx    # Page title + action slot
```

## Design system

Vault Co uses a dark premium theme. All colors are defined as CSS variables in `globals.css` under `@theme inline`:

| Token | Value | Usage |
|---|---|---|
| `vault-gold` | `#c9a84c` | Primary accent, CTAs, active nav |
| `vault-gold-light` | `#e8c97a` | Hover states |
| `vault-bg` | `#0d0e12` | Page background |
| `vault-surface` | `#13151c` | Card/panel backgrounds |
| `vault-surface-2` | `#1a1d27` | Nested elements, hover states |
| `vault-border` | `#2a2e42` | Default borders |
| `vault-text` | `#e8eaf0` | Primary text |
| `vault-muted` | `#7b82a0` | Secondary/placeholder text |

Use inline hex values directly in className (e.g. `bg-[#13151c]`) — Tailwind v4 resolves them.

## Key conventions

- All interactive components that use hooks must have `"use client"` at the top
- Server components (no hooks, no event handlers) are the default — no directive needed
- Tailwind v4: no `tailwind.config.ts` theme extension, use `@theme inline` in CSS instead
- Import alias `@/` maps to `src/`

## Dev

```bash
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

## AI Backend

### Environment variables (`.env.local`)

```bash
AI_PROVIDER=mock          # mock | anthropic | openai
ANTHROPIC_API_KEY=        # required when AI_PROVIDER=anthropic
OPENAI_API_KEY=           # required when AI_PROVIDER=openai
```

### How AI_PROVIDER works

| Value | Behaviour |
|---|---|
| `mock` | Uses deterministic template logic — no API key needed |
| `anthropic` | Calls `claude-sonnet-4-6` via Anthropic API. Falls back to mock if key absent or call fails. |
| `openai` | Calls `gpt-4o` via OpenAI API with `response_format: json_object`. Falls back to mock if key absent or call fails. |

### Adding API keys

1. Open `.env.local` at the project root
2. Paste your key next to the correct variable
3. Set `AI_PROVIDER=anthropic` or `AI_PROVIDER=openai`
4. Restart `npm run dev` — environment variables require a server restart

### Mock fallback

The app **always falls back to mock** when:
- `AI_PROVIDER=mock` (default)
- The API key variable is empty
- The provider API call returns an error

A grey "Mock AI mode active" notice appears in the AI Campaign Builder when mock is in use.

### AI service files

```
src/lib/ai/
  mock.ts       # Deterministic mock draft generator (client-safe — no process.env)
  prompts.ts    # System prompt + buildCampaignPrompt() + JSON schema description
  service.ts    # Server-only: routes to provider, handles fallback, parses AI JSON
src/app/api/ai/
  generate-campaign/route.ts  # POST /api/ai/generate-campaign
```

### Campaign generation flow

1. User fills form in AI Campaign Builder → clicks **Generate Full Campaign Draft**
2. Frontend `POST /api/ai/generate-campaign` with `{ client, service, market, budget, goal, creativeType }`
3. Route handler calls `generateCampaignDraft()` in `service.ts`
4. Service reads `AI_PROVIDER`, routes to correct provider or mock
5. Returns `{ draft: CampaignDraft, mockMode: boolean, provider: string, notice?: string }`
6. Frontend renders the draft; shows mock mode notice if `mockMode === true`
7. If the API call fails entirely, the frontend falls back to local `generateMockPlan()` client-side

### AI safety rule (enforced everywhere)

> The AI generates drafts and recommendations only. It cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without human approval.

This rule appears in the system prompt, the UI safety banner, every approval action, and the optimization rules section of every generated draft.

## Campaign draft & approval workflow

State is managed in `PlanProvider` (React context + localStorage).

| File | Role |
|---|---|
| `src/lib/planStore.ts` | Types: `CampaignDraft`, `DraftStatus`, all nested interfaces |
| `src/components/PlanProvider.tsx` | Context: `saveDraft`, `updateStatus`, `getPlan`, `plans` |
| `src/app/ai-agent/page.tsx` | Builder + `ApprovalBar` buttons (Save Draft, Submit, Approve, etc.) |
| `src/app/approvals/page.tsx` | Approval queue showing submitted drafts with live action buttons |

Draft status flow: `draft` → `needs_review` → `approved` → `ready_for_meta` (or `rejected` / `changes_requested`)

## Data Layer

### Architecture

The app uses a **data provider abstraction** at `src/lib/data/data-provider.ts`. All new data access must go through this interface — do not add new direct imports of mock arrays in pages or components.

| File | Role |
|---|---|
| `src/lib/data/data-provider.ts` | `DataProvider` interface + `getDataProvider()` factory |
| `src/lib/data/mock-provider.ts` | In-memory implementation using existing mock files |
| `src/lib/data/supabase-provider.ts` | Supabase implementation (active when env vars present) |
| `src/lib/supabase/client.ts` | Browser Supabase client (returns `null` if no env vars) |
| `src/lib/supabase/server.ts` | Server Supabase client (service role — server-side only) |
| `src/lib/supabase/types.ts` | TypeScript types mirroring the DB schema |

### Rules for all future data work

1. **Always use `getDataProvider()`** for new data reads and writes — never import `clients`, `MOCK_CREATIVE_ASSETS`, or `KACZMAR_INTELLIGENCE` directly in new feature code.
2. **Existing direct imports** in current pages (`@/lib/data`, `@/lib/creativeAssets`, `@/lib/clientIntelligence`) are grandfathered in. Migrate them to the provider when the feature is being actively updated — do not migrate as a separate refactor task.
3. **Server-side operations** (route handlers, server components) that need privileged DB access must use `getSupabaseServerClient()` from `src/lib/supabase/server.ts` — never the browser client.
4. **Never expose `SUPABASE_SERVICE_ROLE_KEY`** in any file that does not have `// Server-side` in its header comment. The variable name does not start with `NEXT_PUBLIC_` for a reason.
5. **Mock fallback is mandatory** — every new provider method must fall back to mock data when Supabase returns an error or empty result. The app must always be fully functional without a database.
6. **Schema changes** go in `/docs/database-schema.md` first (as a new `ALTER TABLE` or new table block), then in `src/lib/supabase/types.ts`, then in the provider implementations.

### When to read the database docs

| Task | Read first |
|---|---|
| Adding a new data entity | `docs/database-schema.md` |
| Connecting Supabase for the first time | `docs/supabase-setup.md` |
| Changing a provider method | `src/lib/data/data-provider.ts` interface |

## Marketing Knowledge Base

All strategic context for this project lives in `/docs/vault-co-marketing-brain/`.

### Required reading before modifying these areas

| Area | Read before touching |
|---|---|
| AI Campaign Builder (`ai-agent/page.tsx`, `lib/ai/`) | `campaign-builder-output-schema.md`, `meta-ads-playbook.md` |
| Client Intelligence (`clientIntelligence.ts`, `extract-intelligence` route) | `client-intelligence-schema.md` |
| Creative Intelligence (`creativeAssets.ts`, `agents/creativeAnalysis.ts`) | `creative-intelligence-playbook.md` |
| Compliance fields in any draft | `compliance-rules.md` |
| GHL workflow generation | `ghl-follow-up-playbook.md` |
| Ad copy, hooks, CTAs, buyer psychology | `roofing-buyer-psychology.md` |
| Meta integration or campaign publishing | `meta-ads-playbook.md`, `compliance-rules.md` |
| Approvals workflow | `campaign-builder-output-schema.md` (Draft Status Flow section) |
| Reports or analytics | `meta-ads-playbook.md` (Performance Benchmarks section) |
| Brand voice, positioning, or copy tone | `vault-co-positioning.md` |

### Why this matters

The AI Campaign Builder generates output that will be reviewed by humans and eventually used to spend real money on Meta ads for real clients. The knowledge base documents what makes a Vault Co campaign correct, compliant, and effective. Any change to campaign generation logic, prompt structure, schema fields, or output sections must be consistent with these documents.

If a new feature contradicts something in the knowledge base, update the knowledge base first and confirm the change is intentional before implementing it in code.
