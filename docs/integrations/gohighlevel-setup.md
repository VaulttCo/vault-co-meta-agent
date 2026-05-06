# GoHighLevel Integration Setup

## Overview
The GoHighLevel (GHL) integration provides read-only access to pipeline data (contacts, appointments, booked, pipeline value, closed revenue) for Vault Co clients.

## Setup Instructions
1. Go to the GoHighLevel Marketplace Settings
2. Create a new Private App
3. Add scopes: `contacts.readonly`, `opportunities.readonly`, `calendars.readonly`
4. Generate an API Key
5. Add the key to Vercel environment variables:
   `GHL_API_KEY=your_key_here`

## How it Works
- **Read-Only**: The integration only reads data. It never creates or modifies contacts or pipelines.
- **Per-Client Mapping**: Each client in the portal is mapped to a specific GHL Location ID in the Integrations tab.
- **Syncing**: Data is synced on-demand when clicking "Sync Now" in the client profile.
- **Storage**: Snapshots are stored in the `ghl_pipeline_snapshots` Supabase table.
