# Vault Co — AI Provider Setup

## Overview

Vault Co supports three AI providers for campaign generation and intelligence extraction:

| `AI_PROVIDER` value | Behavior |
|---|---|
| `mock` (default) | Deterministic template output — no API key required |
| `anthropic` | Calls `claude-sonnet-4-6` via Anthropic API |
| `openai` | Calls `gpt-4o` via OpenAI API with JSON mode |

**The app always falls back to mock mode** when:
- `AI_PROVIDER=mock`
- The selected provider has no API key set
- The provider API call returns an error

---

## Quick Start — Anthropic (Recommended)

1. Get your key at [console.anthropic.com](https://console.anthropic.com)

2. Open `.env.local` at the project root and set:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

3. Restart the dev server:
```bash
npm run dev
```

The "Mock AI mode active" notice will disappear from the Campaign Builder once a campaign is generated. A green "Generated with Anthropic Claude" badge will appear instead.

---

## Quick Start — OpenAI

1. Get your key at [platform.openai.com](https://platform.openai.com/api-keys)

2. Open `.env.local` and set:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key-here...
```

3. Restart the dev server.

---

## AI-Powered Functions

All AI calls are server-side only. API keys are never exposed to the browser.

### 1. Campaign Generation — `POST /api/ai/generate-campaign`

Generates a complete Meta advertising campaign draft including:
- Meta campaign structure (ad sets, audience, placements, budget split)
- Ad copy (3 primary text variants, headlines, descriptions, CTA)
- Lead form (questions, consent language, thank-you copy)
- GHL follow-up workflow (immediate SMS, email, setter task, AI voice trigger)
- Creative direction (shot list, text overlays, voiceover script)
- Compliance check (Meta risk, SMS TCPA, disallowed phrases, approval warnings)
- Optimization rules (CPL threshold, pause rules, scaling rules)
- Buyer psychology, market research, strategic rationale (when intelligence available)

**Uses**: Client profile + Client Intelligence + creative asset metadata + Vault Co marketing brain principles.

### 2. Intelligence Extraction — `POST /api/ai/extract-intelligence`

Extracts structured `ClientIntelligence` JSON from a pasted onboarding summary. Populates all 12 intelligence sections:
- Company profile, service area, target market
- Buyer psychology, market research, offer intelligence
- Sales intelligence, brand intelligence, KPI baseline
- Sales audit, content planning, campaign implications

**Uses**: Full `ClientIntelligence` schema injected into the prompt so the AI knows exactly what to return.

### 3. Creative Analysis — `POST /api/ai/analyze-creative`

Analyzes creative asset metadata (type, service, market, notes, tags) and returns:
- Creative strength assessment
- Trust signals the creative communicates
- Audience temperature fit (Cold/Warm/Hot)
- Recommended hook, angle, CTA
- 3 hook variants to test
- Compliance notes specific to creative type
- Retargeting use case
- Placement recommendations

**Does not require actual image/video upload** — analysis is metadata-driven.

### 4. Weekly Report Generation — `POST /api/ai/generate-report`

Generates a premium weekly performance report from raw KPI data:
- Executive summary (operator-facing)
- Wins, issues, next actions sections
- Agent recommendations (all require human approval)
- Client-ready narrative (the full text to send to the client)
- Approval note (reminder that human review is required)

---

## Testing

### Test mock mode
```bash
# .env.local
AI_PROVIDER=mock
```
Expected: "Mock AI mode active" badge in Campaign Builder. Template-based output with no API calls.

### Test live Anthropic mode
```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
```
Expected: "Generated with Anthropic Claude" green badge after generation. Output will be specific to the client, market, and intelligence loaded.

### Test campaign generation (curl)
```bash
curl -X POST http://localhost:3000/api/ai/generate-campaign \
  -H "Content-Type: application/json" \
  -d '{
    "client": {"id":"kaczmar-builders","name":"Kaczmar Builders","owner":"Stanley Kaczmar","phone":"216-210-3645","market":"Northeast Ohio","services":["Roof Replacement"],"avgJobValue":"$25,000","monthlyBudget":"$2,000/mo","offer":"Free roof inspection","brandTone":"Premium family-owned","metaAccountId":"act_pending","pixelId":"pending","fbPageId":"pending","instagramId":"pending","ghlLocationId":"pending","ghlPipelineId":"pending","email":"stan@kaczmarbuilders.com","website":"kaczmarbuilders.com","notes":"","status":"active","campaigns":[],"stats":{"leads":0,"booked":0,"cpl":"—","cpba":"—","showRate":"—","pipeline":"—","revenue":"—","spend":"—"}},
    "service": "Roof Replacement",
    "market": "Northeast Ohio",
    "budget": "$2000",
    "goal": "Lead Generation"
  }'
```

### Test intelligence extraction (curl)
```bash
curl -X POST http://localhost:3000/api/ai/extract-intelligence \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client",
    "onboardingSummary": "Owner: John Smith. Roofing company in Phoenix AZ. Serves Scottsdale, Chandler, Gilbert. Average job $12,000. GAF certified. 15 leads/month currently. Biggest problem: price shoppers. Target: homeowners 40-65 with HOA homes."
  }'
```

### Test creative analysis (curl)
```bash
curl -X POST http://localhost:3000/api/ai/analyze-creative \
  -H "Content-Type: application/json" \
  -d '{
    "assetType": "Owner On Camera",
    "fileType": "video",
    "fileName": "owner_intro.mp4",
    "service": "Roof Replacement",
    "market": "Northeast Ohio",
    "tags": ["trust", "owner", "cold-audience"],
    "notes": "Owner speaks directly to camera for 30 seconds about 25 years in roofing",
    "approvedForAds": true,
    "campaignUseCase": "Cold prospecting trust builder"
  }'
```

### Test weekly report generation (curl)
```bash
curl -X POST http://localhost:3000/api/ai/generate-report \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Kaczmar Builders",
    "reportPeriod": "May 2026 — Week 1",
    "spend": "$487",
    "leads": 18,
    "booked": 7,
    "cpl": "$27",
    "cpba": "$70",
    "showRate": "90%",
    "pipelineValue": "$175,000",
    "revenueGenerated": "$42,000",
    "wins": ["CPL hit $27 — below $75 target", "7 booked appointments in 5 days"],
    "issues": ["Two no-shows — setter follow-up needed"],
    "nextActions": ["Test storm damage creative this week", "Review setter response time for cold leads"]
  }'
```

---

## Fallback Behavior

If the API key is present but the call fails (rate limit, timeout, invalid response):
- The service logs the error server-side
- Falls back to mock output automatically
- Returns `mockMode: true` and `notice: "...failed — using mock fallback"` in the response
- The UI shows the fallback notice instead of the live AI badge

The app never crashes due to AI provider failures — mock output is always available.

---

## Model Reference

| Provider | Model Used | Max Output |
|---|---|---|
| Anthropic | `claude-sonnet-4-6` | 8,192 tokens (campaign/extraction), 4,096 (report), 2,048 (creative) |
| OpenAI | `gpt-4o` | Same limits, JSON mode enabled |
