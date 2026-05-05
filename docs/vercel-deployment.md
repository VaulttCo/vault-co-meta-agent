# Vercel Deployment Guide

Step-by-step instructions for deploying the Vault Co portal to Vercel.

## Prerequisites

- A GitHub account with the project pushed to a repository
- A Vercel account (vercel.com — free hobby plan works)
- Optional: Supabase project created and schema migrated (see `docs/supabase-setup.md`)
- Optional: Anthropic or OpenAI API key for live AI generation

## Step 1 — Push to GitHub

If the project is not yet on GitHub:

```bash
git init
git add .
git commit -m "Initial commit — Vault Co Meta Ads AI Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Step 2 — Import to Vercel

1. Go to vercel.com and sign in
2. Click **Add New → Project**
3. Select **Import Git Repository** and find your repo
4. Vercel will auto-detect Next.js — no framework configuration needed
5. Leave Build Command and Output Directory at their defaults

## Step 3 — Add Environment Variables

In the Vercel import screen (or later in Project Settings → Environment Variables), add:

| Variable | Value | Environment |
|---|---|---|
| `AI_PROVIDER` | `anthropic` (or `mock` to start) | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key | Production, Preview |

**Minimum viable deployment:** You can deploy with zero environment variables. The app runs fully in mock mode. Add keys when you're ready to enable live features.

## Step 4 — Deploy

Click **Deploy**. Vercel runs `npm run build`. The build should complete in under 60 seconds.

Verify the build output shows all 19 routes:
```
○ /
○ /ai-agent
○ /analytics
○ /approvals
○ /campaigns
○ /clients
ƒ /clients/[id]
○ /creatives
○ /login
○ /reports
○ /settings
ƒ /api/ai/generate-campaign
ƒ /api/ai/generate-report
ƒ /api/ai/analyze-creative
ƒ /api/ai/extract-intelligence
...
```

## Step 5 — Verify the deployment

1. Open the deployed URL
2. Sign in using demo credentials shown on the login screen
3. Navigate to Settings → check that provider status matches your env vars
4. Go to Veronica (AI Campaign Builder) and confirm AI mode (live or mock)
5. Test generating a campaign draft end-to-end

## Step 6 — Custom domain (optional)

In Vercel Project Settings → Domains:

1. Click **Add**
2. Enter your domain (e.g., `portal.vaultco.agency`)
3. Add the DNS records Vercel shows to your domain registrar
4. Vercel provisions an SSL certificate automatically

## Redeployments

Vercel redeploys automatically on every push to `main`. To redeploy manually:

```bash
# Trigger a new deployment without code changes
git commit --allow-empty -m "trigger redeploy"
git push
```

Or use the Vercel dashboard → Deployments → Redeploy.

## Environment variable updates

After changing environment variables in the Vercel dashboard, you must **redeploy** for the changes to take effect. Vercel does not hot-reload env vars.

## Preview deployments

Every pull request gets a unique preview URL automatically. This is useful for reviewing UI changes before merging to main.

Preview deployments inherit Production environment variables unless overridden. Be careful not to point preview deployments at a production Supabase database.

## Rollbacks

In the Vercel dashboard → Deployments, you can promote any previous deployment back to Production with one click.

## Monitoring

Vercel provides:
- **Function logs** — for API route debugging (Project → Logs)
- **Build logs** — for deployment debugging
- **Analytics** — page views and performance (optional add-on)

For production monitoring of AI API usage, check your Anthropic or OpenAI dashboard directly.
