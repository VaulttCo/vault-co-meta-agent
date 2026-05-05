# Vault Co — Meta Ads AI Agent

A Next.js 16 dashboard for AI-powered Meta advertising management, powered by **Veronica** — Vault Co's AI Growth Operator.

## What This Is

Vault Co is an internal operations portal for a Meta advertising agency. It gives the team:

- **Veronica (AI Campaign Builder)** — generates complete, production-ready Meta ad campaign drafts using client intelligence, creative analysis, buyer psychology, and market research
- **Client Intelligence** — structured extraction of onboarding data, injected into every campaign
- **Creative Intelligence** — creative asset library with AI analysis that shapes campaign copy, hooks, and placements
- **Approval Workflow** — human review gates before any campaign, budget change, or GHL workflow can go live
- **Creatives Library** — manage and approve creative assets before use in campaigns
- **Campaign Management** — overview of active and draft campaigns
- **Analytics & Reporting** — performance dashboards (placeholder, ready for Meta API integration)

### Veronica

Veronica is the AI operator embedded in the portal. She studies client onboarding data, buyer psychology, market context, creative assets, and campaign performance to build approval-ready campaign drafts for roofing and construction clients.

**Safety rule (enforced everywhere):** Veronica can research, generate, recommend, and draft. Veronica cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without human approval.

## Stack

- **Framework**: Next.js 16 (App Router, `src/` directory)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first config in `globals.css`)
- **Icons**: lucide-react
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) or OpenAI (`gpt-4o`), with mock fallback
- **Database**: Supabase (optional — falls back to mock data when not configured)
- **Storage**: Supabase Storage (optional — falls back to mock when not configured)
- **Auth**: Demo auth via `AuthProvider` (replace with Supabase Auth before client access)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Default demo credentials are shown on the login screen.

## Environment Variables

Create `.env.local` at the project root:

```bash
# AI provider
AI_PROVIDER=mock          # mock | anthropic | openai
ANTHROPIC_API_KEY=        # required when AI_PROVIDER=anthropic
OPENAI_API_KEY=           # required when AI_PROVIDER=openai

# Supabase (optional — app works fully without these)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-side only — never expose to browser
```

The app always falls back to mock mode when keys are absent or API calls fail. See `docs/environment-variables.md` for the full reference.

## Deployment

See `docs/vercel-deployment.md` for step-by-step Vercel deployment instructions and `docs/deployment-checklist.md` for a pre-launch checklist.

## Project Structure

```
src/
  app/
    ai-agent/         # Veronica — AI Campaign Builder
    approvals/        # Approval queue
    campaigns/        # Campaign management
    clients/          # Client records + intelligence
    creatives/        # Creative asset library
    analytics/        # Performance reporting
    audiences/        # Audience targeting
    reports/          # Weekly client reports
    settings/         # Integrations config
    api/ai/           # Server-side AI route handlers
  lib/
    ai/               # AI service: mock, prompts, service router
    agents/           # Buyer psychology, market research, creative analysis agents
    data/             # DataProvider abstraction + mock/Supabase implementations
    supabase/         # Supabase browser/server clients + types
    planStore.ts      # CampaignDraft type + status types
    clientIntelligence.ts
    creativeAssets.ts
  components/
    layout/           # Sidebar, Topbar
    ui/               # Badge, StatCard, PageHeader
    PlanProvider.tsx  # Campaign draft state + Supabase sync
    IntelligenceProvider.tsx
    StorageProvider.tsx
docs/
  vault-co-marketing-brain/   # Marketing knowledge base (required reading)
  database-schema.md          # Supabase schema + seed data
  supabase-setup.md           # Supabase connection guide
  environment-variables.md    # All env vars documented
  deployment-checklist.md     # Pre-launch checklist
  vercel-deployment.md        # Vercel deployment guide
```

## Marketing Knowledge Base

All strategic context for campaign generation lives in `/docs/vault-co-marketing-brain/`. These documents define what makes a Vault Co campaign correct, compliant, and effective. They are required reading before modifying the AI Campaign Builder, client intelligence, creative intelligence, approvals, or compliance logic.

| File | Contents |
|---|---|
| `vault-co-positioning.md` | Agency positioning, who we serve, what we are not |
| `roofing-buyer-psychology.md` | Homeowner psychology, objections, trust triggers |
| `meta-ads-playbook.md` | Campaign types, budgets, performance benchmarks |
| `ghl-follow-up-playbook.md` | Follow-up workflow rules, SMS timing, lost lead recovery |
| `compliance-rules.md` | What the AI must never generate — policy, TCPA, insurance |
| `campaign-builder-output-schema.md` | Full schema for every generated campaign draft section |
| `client-intelligence-schema.md` | Onboarding extraction schema — all fields documented |
| `creative-intelligence-playbook.md` | How each creative type shapes campaign generation |

## Pushing to GitHub

### First push (new repository)

1. Create a new repository on GitHub (do not initialize with README — this project already has one)
2. In this directory, run:

```bash
git init
git add .
git commit -m "Initial commit — Vault Co Meta Ads AI Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Ongoing workflow

```bash
git add .
git commit -m "describe what changed"
git push
```

### What to keep out of git

`.env.local` is already in `.gitignore` and must never be committed. It contains API keys and service role credentials. If you ever accidentally commit a key, rotate it immediately.

## Data Layer

The app uses a data provider abstraction (`src/lib/data/data-provider.ts`) that routes to either Supabase or an in-memory mock implementation. All data access in new features must go through `getDataProvider()`.

- When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, the app uses Supabase.
- When those vars are missing, the app falls back to mock data silently.
- The Settings page shows the active provider and env var status.

See `docs/supabase-setup.md` to connect a Supabase project.

## Keeping AI Coding Sessions Safe and Focused

When using an AI coding assistant (Claude Code or similar) to work on this project:

### Before starting any session

1. Tell the AI what feature or fix you are working on
2. Reference the specific files involved
3. Reference the relevant knowledge base doc if touching campaign generation, compliance, or intelligence
4. State explicitly what must NOT be changed (e.g., "do not touch the approval workflow")

### Scope boundaries to enforce

- "Do not rebuild from scratch" — always extend existing code
- "Do not remove the Vault Co branding" — the dark/gold design system is intentional
- "Do not remove the AI safety rule" — Veronica must never publish, activate, or modify live campaigns
- "Do not break existing routes" — all 19 routes must build successfully
- "Run npm run build before finishing" — zero TypeScript errors is the bar

### After each session

- Run `npm run build` and confirm zero errors
- Check the git diff to review exactly what changed
- Commit with a descriptive message
- Update the relevant knowledge base doc if strategic decisions were made

### Signs a session went off track

- Build fails with TypeScript errors
- Existing pages are missing or broken
- The Veronica safety banner was removed from the Campaign Builder
- Routes that were working no longer appear in the build output
- The dark theme colors were changed or replaced with defaults

If any of these happen, use `git diff` to identify the changes and revert the specific files that broke.

## Build

```bash
npm run build    # must produce zero TypeScript errors
npm run dev      # http://localhost:3000
npm run lint
```

All 19 routes should appear in the build output. Any missing route is a regression.
