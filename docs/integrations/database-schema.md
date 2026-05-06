# Integration Database Schema

## Tables

### `integration_connections`
Stores the mapping between Vault Co clients and external provider accounts.
- `id` (uuid, pk)
- `client_id` (uuid, fk to clients)
- `provider` (text: 'meta' or 'ghl')
- `provider_account_id` (text)
- `connection_status` (text: 'connected', 'error', 'disconnected')
- `last_synced_at` (timestamptz)

### `meta_campaign_snapshots`
Stores point-in-time snapshots of Meta Ads campaign performance.
- `id` (uuid, pk)
- `client_id` (uuid, fk to clients)
- `campaign_id` (text)
- `campaign_name` (text)
- `spend` (numeric)
- `leads` (integer)
- `impressions` (integer)
- `clicks` (integer)
- `synced_at` (timestamptz)

### `ghl_pipeline_snapshots`
Stores point-in-time snapshots of GoHighLevel pipeline performance.
- `id` (uuid, pk)
- `client_id` (uuid, fk to clients)
- `location_id` (text)
- `contacts` (integer)
- `appointments` (integer)
- `booked_appointments` (integer)
- `pipeline_value` (numeric)
- `closed_revenue` (numeric)
- `synced_at` (timestamptz)
