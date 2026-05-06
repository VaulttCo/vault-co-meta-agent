# Veronica Performance Intelligence

## Overview
Veronica Performance Intelligence is an AI-powered analysis engine that runs on top of synced Meta Ads and GoHighLevel data.

## How it Works
1. **Data Aggregation**: The system pulls the latest `meta_campaign_snapshots` and `ghl_pipeline_snapshots` for a client.
2. **AI Analysis**: The combined data is sent to Anthropic Claude (via `ANTHROPIC_API_KEY`).
3. **Structured Output**: Claude returns a structured JSON response containing:
   - Performance Summary
   - Wins
   - Issues
   - Recommendations
   - Next Actions
   - Veronica's Note

## Requirements
- `ANTHROPIC_API_KEY` must be set in Vercel environment variables.
- At least one integration (Meta or GHL) must be connected and synced for the client.
