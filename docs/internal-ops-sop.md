# Vault Co — Internal Operations SOP

Standard operating procedures for the Vault Co Meta Ads AI Agent platform.

---

## 1. Onboarding a New Client

### 1.1 Prerequisites
- Signed contract and billing confirmed
- Client's Meta Ads account ID available
- GHL sub-account provisioned (or scheduled)

### 1.2 Steps

1. **Create client record** — Navigate to `/clients`, click **Add Client**. Fill in name, owner, market, services, monthly budget, avg job value, and status (`onboarding`).
2. **Upload onboarding summary** — Go to `/creatives`, upload the client's onboarding PDF. Set category to **Onboarding Summary**, client to the new record.
3. **Extract intelligence** — On the client detail page (`/clients/[id]`), use the Extract Intelligence action to parse the PDF and populate the client intelligence fields.
4. **Build first campaign draft** — Go to `/ai-agent`, select the client, fill in service/market/budget/goal, click **Generate Full Campaign Draft**.
5. **Submit for review** — Click **Submit for Review** in the ApprovalBar. The draft moves to `needs_review`.
6. **Approve and hand off** — Admin reviews at `/approvals`, clicks **Approve**. Draft status becomes `approved`. Notify media buyer to begin Meta setup.

---

## 2. Campaign Approval Workflow

Status flow: `draft` → `needs_review` → `approved` → `ready_for_meta` (or `rejected` / `changes_requested`)

| Status | Who acts | Action |
|---|---|---|
| `draft` | Media Buyer / Admin | Generate and save the draft |
| `needs_review` | Admin | Review at `/approvals` |
| `approved` | Admin | Mark approved |
| `ready_for_meta` | Media Buyer | Begin Meta Ads setup manually |
| `rejected` | Media Buyer | Revise and resubmit |
| `changes_requested` | Media Buyer | Address feedback, resubmit |

**Safety rule:** The AI generates drafts and recommendations only. It cannot publish campaigns, activate ads, increase budgets, send reports, or push GHL workflows without human approval.

---

## 3. Creative Asset Management

### Uploading
- Navigate to `/creatives` → **Upload Creative**
- Supported formats: JPEG, PNG, MP4, MOV
- Set client, asset type, service, market, and campaign use case before uploading
- Status starts as `Uploaded` automatically

### Review & Approval
- Media buyers mark assets **Needs Review** when flagged for QC
- Admin approves assets via the **Approve** action (status → `Approved`)
- Approved assets are eligible for inclusion in campaign creative sets

### Deletion
- Only admins may delete assets
- Deletion removes the DB row; the Storage file is NOT automatically purged — remove manually from the Supabase Storage bucket if needed

---

## 4. AI Campaign Builder Usage

1. Select client and fill form fields (service, market, budget, goal, creative type)
2. Click **Generate Full Campaign Draft** — takes 5–15 seconds
3. Review all sections: targeting, ad sets, copy, compliance, GHL workflow, optimization rules
4. If **Mock AI mode** banner is visible, no Anthropic key is configured — output is deterministic template only
5. Do not skip the compliance section — it contains required disclaimers for roofing/contractor verticals

---

## 5. Routine Maintenance

### Weekly
- Review `/approvals` for stale drafts in `needs_review` (older than 7 days)
- Check Supabase Storage bucket for orphaned files (no matching `creative_assets` row)
- Verify Meta and GHL integrations are connected (`/settings`)

### Monthly
- Archive campaigns not moved to `ready_for_meta` within 30 days
- Audit `creative_assets` for rows with null `storage_url` and stale `uploaded` status (see `docs/migrations/004_creative_assets_status_audit.sql`)
- Review AI provider spend if `AI_PROVIDER=anthropic`

---

## 6. Access Roles

| Role | Access |
|---|---|
| `admin` | Full access: clients, creatives, campaigns, approvals, settings, AI agent |
| `media_buyer` | Creatives upload, campaign generation, submit for review |
| `setter` | Read-only: clients, creatives, analytics |

Role assignments are managed in `user_profiles.role` in Supabase. Only admins may change roles.

---

## 7. Escalation

- **Platform bugs / errors** — Document with screenshots and browser console output; file in the internal issue tracker
- **Supabase outage** — App falls back to mock data automatically; no uploads will persist until Supabase is restored
- **AI provider errors** — App falls back to mock campaign generation; check Anthropic dashboard for quota or key issues
- **Meta API errors** — Check `/settings` integration status panel; re-authenticate if token expired
