# Meta Ads Integration Setup

## Overview
The Meta Ads integration provides read-only access to campaign performance data (spend, leads, impressions, clicks) for Vault Co clients.

## Setup Instructions
1. Go to the Meta App Dashboard (developers.facebook.com)
2. Create a new App (Type: Business)
3. Add the "Marketing API" product
4. Generate a System User Access Token with `ads_read` permission
5. Add the token to Vercel environment variables:
   `META_ACCESS_TOKEN=your_token_here`

## How it Works
- **Read-Only**: The integration only reads data. It never creates or modifies campaigns.
- **Per-Client Mapping**: Each client in the portal is mapped to a specific Meta Ad Account ID in the Integrations tab.
- **Syncing**: Data is synced on-demand when clicking "Sync Now" in the client profile.
- **Storage**: Snapshots are stored in the `meta_campaign_snapshots` Supabase table.
