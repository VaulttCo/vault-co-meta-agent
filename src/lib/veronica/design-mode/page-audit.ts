/**
 * Vault Co Page Audit System
 *
 * Structured pre-redesign audit for every page in the portal.
 * Before any page is redesigned, its audit entry must be:
 *   1. status: "audited"
 *   2. All checklist items reviewed
 *   3. approved: true (set by the engineer before touching the file)
 *
 * This is a static data structure — it does not execute at runtime.
 * It is the governance record for what has been reviewed and what is pending.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditStatus =
  | "not-started"    // page not yet audited
  | "audited"        // audit complete, findings documented
  | "approved"       // approved for redesign in next phase
  | "in-progress"    // redesign actively in progress
  | "complete"       // redesign complete and build verified
  | "frozen";        // do not touch — contains auth/data/integration logic

export type DesignPhase =
  | "phase-1"   // completed: VaultUI system, StatCard, table rows, AI agent, revenue, reports
  | "phase-2a"  // completed: framer-motion + shadcn install
  | "phase-2b"  // pending: motion implementation
  | "phase-3"   // pending: console + settings + victoria + operator queue
  | "phase-4"   // pending: advanced shadcn components, full design system coverage
  | "exempt";   // Command Hub — standalone, exempt from phased redesign

export interface PageAuditIssue {
  severity: "critical" | "moderate" | "minor";
  description: string;
  file?: string;
  line?: number;
}

export interface PageAuditEntry {
  route: string;
  file: string;
  status: AuditStatus;
  completedPhase: DesignPhase | null;
  pendingPhase: DesignPhase | null;
  approved: boolean;
  linesOfCode: "small (<300)" | "medium (300–800)" | "large (800–2000)" | "xl (2000+)";
  containsDataLogic: boolean;     // has getDataProvider, Supabase, fetch calls
  containsAuthLogic: boolean;     // has useAuth, signIn, signOut, middleware
  containsAILogic: boolean;       // has Anthropic/AI API calls
  containsIntegrations: boolean;  // has Meta/GHL/Stripe API calls
  knownIssues: PageAuditIssue[];
  completedWork: string[];
  pendingWork: string[];
  redesignNotes: string;
}

// ─── Pre-redesign approval checklist ─────────────────────────────────────────

export const PRE_REDESIGN_CHECKLIST = [
  "[ ] Read the page file top-to-bottom before touching anything",
  "[ ] Identify ALL data-fetching calls (getDataProvider, fetch, Supabase)",
  "[ ] Identify ALL auth checks (useAuth, can(), permissions)",
  "[ ] Identify ALL state that controls UI visibility (loading, error, empty)",
  "[ ] List every component imported — check for shared components that other pages use",
  "[ ] Check if the page has any localStorage / sessionStorage usage",
  "[ ] Check if the page is a client component ('use client') or server component",
  "[ ] Confirm the page is NOT in FROZEN status (settings, auth, integrations)",
  "[ ] Run pnpm run build before any changes — baseline must be clean",
  "[ ] Identify the ONE layout change that will have the highest visual impact",
  "[ ] Plan changes as a list — submit for review before coding",
  "[ ] After changes: confirm all data fetching, state, and auth logic is byte-for-byte identical",
  "[ ] Run pnpm run build after changes — must be clean",
] as const;

// ─── Page audit registry ──────────────────────────────────────────────────────

export const PAGE_AUDIT: Record<string, PageAuditEntry> = {

  // ── Command Hub (standalone, exempt) ────────────────────────────────────────
  commandHub: {
    route: "/",
    file: "src/app/page.tsx",
    status: "complete",
    completedPhase: "phase-1",
    pendingPhase: null,
    approved: true,
    linesOfCode: "medium (300–800)",
    containsDataLogic: true,
    containsAuthLogic: true,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [
      "Premium gradient portal cards with hover glow",
      "Animated transition overlay on module enter",
      "System status strip with live indicators",
      "Ambient background glows",
    ],
    pendingWork: [],
    redesignNotes: "Exempt from phased redesign. This page is a custom full-screen experience. Do not apply VCPanel or standard page layout here.",
  },

  // ── Veronica AI Overview ─────────────────────────────────────────────────────
  veronicaOverview: {
    route: "/ai-agent",
    file: "src/app/ai-agent/page.tsx",
    status: "complete",
    completedPhase: "phase-1",
    pendingPhase: "phase-2b",
    approved: true,
    linesOfCode: "large (800–2000)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: true,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [
      "Replaced inline StatTile with VCStat from VaultUI",
      "All panels converted to VCPanel + VCPanelHeader",
      "Hermes Operator panel uses vc-panel-header CSS class",
      "Meta Intelligence panel uses VCPanel",
    ],
    pendingWork: [
      "Phase 2B: Add panelVariants stagger on initial load (max 4 panels)",
    ],
    redesignNotes: "Hero section should stay as-is. Only motion work pending.",
  },

  // ── Veronica Console ──────────────────────────────────────────────────────────
  veronicaConsole: {
    route: "/ai-agent/console",
    file: "src/app/ai-agent/console/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: true,
    containsIntegrations: true,
    knownIssues: [
      { severity: "moderate", description: "10+ raw bg-[var(--t-surface)] border panel patterns not using vc-panel class" },
      { severity: "minor",    description: "Multiple empty-state divs could use VCEmptyState" },
    ],
    completedWork: [],
    pendingWork: [
      "Audit all panel wrappers → VCPanel",
      "Replace empty state blocks → VCEmptyState",
      "DO NOT touch: AI streaming logic, campaign draft generation, approval flow",
    ],
    redesignNotes: "Most complex page in the portal. Do not start until Phase 3 is explicitly approved. Contains AI streaming, campaign draft state, Meta integration triggers.",
  },

  // ── Clients Table ─────────────────────────────────────────────────────────────
  clients: {
    route: "/clients",
    file: "src/app/clients/page.tsx",
    status: "complete",
    completedPhase: "phase-1",
    pendingPhase: "phase-2b",
    approved: true,
    linesOfCode: "medium (300–800)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [
      "Status-colored left border bar on each table row",
      "vc-table-row hover class applied",
      "VCSearchInput + VCFilterBar replaces raw inputs and filter buttons",
      "vc-panel wrapper on table container",
      "Modal inputs use vc-input CSS class (removed JS focus handlers)",
      "labelCls string replaces labelStyle object",
    ],
    pendingWork: [
      "Phase 2B: Modal entrance animation (modalVariants + backdropVariants)",
    ],
    redesignNotes: "Add Client modal is the only pending motion work. Data logic (addClient, getClients) must not be touched.",
  },

  // ── Client Detail ──────────────────────────────────────────────────────────────
  clientDetail: {
    route: "/clients/[id]",
    file: "src/app/clients/[id]/page.tsx",
    status: "audited",
    completedPhase: "phase-1",
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: true,
    containsIntegrations: true,
    knownIssues: [
      { severity: "moderate", description: "cardCls replaced with vc-panel (3 instances done), but ~10 remaining bg-[#0D1520] blocks with padding still hardcode dark color" },
      { severity: "minor",    description: "inputCls string uses raw color #0f1a28 instead of var(--t-input-bg)" },
    ],
    completedWork: [
      "cardCls constant updated to 'vc-panel'",
      "2 overflow-hidden panel divs replaced with vc-panel",
    ],
    pendingWork: [
      "Phase 3: Remaining ~10 bg-[#0D1520] p-5/p-10 blocks → vc-panel",
      "Phase 3: inputCls → vc-input class",
      "DO NOT touch: Meta sync logic, GHL integration, intelligence extraction",
    ],
    redesignNotes: "The largest single page. Contains Meta API data display, GHL opportunity tracking, AI intelligence extraction. High risk — plan all changes before executing.",
  },

  // ── Revenue Dashboard Overview ────────────────────────────────────────────────
  revenueDashboard: {
    route: "/revenue-dashboard",
    file: "src/app/revenue-dashboard/page.tsx",
    status: "complete",
    completedPhase: "phase-1",
    pendingPhase: null,
    approved: true,
    linesOfCode: "medium (300–800)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [
      "Stat cards use vc-stat-card class (hover glow)",
      "space-y-5 between sections",
      "SectionCard in _components.tsx updated to use vc-panel",
    ],
    pendingWork: [],
    redesignNotes: "Gold accent theme preserved. SectionCard update propagated to all 10 revenue sub-pages via _components.tsx.",
  },

  // ── Revenue Dashboard Client Detail ───────────────────────────────────────────
  revenueClientDetail: {
    route: "/revenue-dashboard/clients/[clientId]",
    file: "src/app/revenue-dashboard/clients/[clientId]/page.tsx",
    status: "frozen",
    completedPhase: null,
    pendingPhase: null,
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: false,
    containsIntegrations: true,
    knownIssues: [
      { severity: "minor", description: "Inline StatCard function has different props from VaultUI VCStat — approved exception, do not replace" },
    ],
    completedWork: [],
    pendingWork: [],
    redesignNotes: "FROZEN. This page has a custom inline StatCard with label/sub/icon/badge props and gold theme. It is an approved exception — do not replace with VCStat. Contains GHL revenue snapshot logic.",
  },

  // ── Reports ────────────────────────────────────────────────────────────────────
  reports: {
    route: "/reports",
    file: "src/app/reports/page.tsx",
    status: "complete",
    completedPhase: "phase-1",
    pendingPhase: "phase-2b",
    approved: true,
    linesOfCode: "large (800–2000)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: true,
    containsIntegrations: true,
    knownIssues: [],
    completedWork: [
      "Stat cards use vc-stat-card with color-coded top accent borders",
      "Table wrapper uses vc-panel",
      "Table rows use vc-table-row",
      "PageHeader has sectionLabel='Veronica AI'",
      "space-y-5 spacing",
    ],
    pendingWork: [
      "Phase 2B: View Report modal entrance animation (modalVariants)",
    ],
    redesignNotes: "View Report modal is the main pending work. AI report generation logic must not be touched.",
  },

  // ── Analytics ──────────────────────────────────────────────────────────────────
  analytics: {
    route: "/analytics",
    file: "src/app/analytics/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "medium (300–800)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: false,
    containsIntegrations: true,
    knownIssues: [
      { severity: "minor", description: "Not yet audited for panel patterns" },
    ],
    completedWork: [],
    pendingWork: [
      "Phase 3: Audit panel patterns → VCPanel",
      "Phase 3: Check for inline stat tiles → VCStat",
    ],
    redesignNotes: "Pending full audit. Contains Meta + GHL aggregate data fetching.",
  },

  // ── Campaigns ──────────────────────────────────────────────────────────────────
  campaigns: {
    route: "/campaigns",
    file: "src/app/campaigns/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "medium (300–800)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [
      { severity: "minor", description: "Uses var(--t-input-bg) as panel background — should be var(--t-surface) via vc-panel" },
    ],
    completedWork: [],
    pendingWork: ["Phase 3: Panel and filter audit"],
    redesignNotes: "Moderate complexity. Safe to audit in Phase 3.",
  },

  // ── Approvals ──────────────────────────────────────────────────────────────────
  approvals: {
    route: "/approvals",
    file: "src/app/approvals/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "medium (300–800)",
    containsDataLogic: true,
    containsAuthLogic: true,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [],
    pendingWork: ["Phase 3: Panel audit, approval action button review"],
    redesignNotes: "Contains approval gate logic. Do not touch approval status mutation functions.",
  },

  // ── Operator Queue ─────────────────────────────────────────────────────────────
  operatorQueue: {
    route: "/operator-queue",
    file: "src/app/operator-queue/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: true,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [
      { severity: "moderate", description: "3 raw surface panel patterns at lines 1651, 1659, 1853" },
    ],
    completedWork: [],
    pendingWork: ["Phase 3: Targeted vc-panel replacements for those 3 panels only"],
    redesignNotes: "Very large page. Make targeted surgical changes only. Contains operator task status mutation logic.",
  },

  // ── Settings ────────────────────────────────────────────────────────────────────
  settings: {
    route: "/settings",
    file: "src/app/settings/page.tsx",
    status: "frozen",
    completedPhase: null,
    pendingPhase: null,
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: true,
    containsAILogic: false,
    containsIntegrations: true,
    knownIssues: [
      { severity: "minor", description: "9+ raw panel patterns using bg-[var(--t-surface)] border border-[var(--t-border)] rounded-xl" },
    ],
    completedWork: [],
    pendingWork: [],
    redesignNotes: "FROZEN. Contains Meta/GHL/Stripe credential forms, API key management, and auth session logic. Never touch this page in a UI pass. Create a separate settings-ui PR with explicit approval.",
  },

  // ── Victoria AI ────────────────────────────────────────────────────────────────
  victoria: {
    route: "/victoria",
    file: "src/app/victoria/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: true,
    containsIntegrations: false,
    knownIssues: [
      { severity: "moderate", description: "10+ raw surface/border panel patterns" },
      { severity: "moderate", description: "Live AI session page — motion additions require careful testing" },
    ],
    completedWork: [],
    pendingWork: ["Phase 3: Full audit. Purple/Victoria theme panel wrappers."],
    redesignNotes: "Contains live transcription and AI coaching session logic. Any motion addition must be tested against the active session state machine. Do not touch until Phase 3 is approved.",
  },

  // ── Creatives ──────────────────────────────────────────────────────────────────
  creatives: {
    route: "/creatives",
    file: "src/app/creatives/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "xl (2000+)",
    containsDataLogic: true,
    containsAuthLogic: false,
    containsAILogic: true,
    containsIntegrations: false,
    knownIssues: [
      { severity: "moderate", description: "5 instances of bg-[#0D1520] border hardcoded dark color" },
    ],
    completedWork: [],
    pendingWork: ["Phase 3: Replace bg-[#0D1520] panel patterns with vc-panel"],
    redesignNotes: "Contains AI creative analysis calls. Separate UI changes from AI logic carefully.",
  },

  // ── Audiences ──────────────────────────────────────────────────────────────────
  audiences: {
    route: "/audiences",
    file: "src/app/audiences/page.tsx",
    status: "not-started",
    completedPhase: null,
    pendingPhase: "phase-3",
    approved: false,
    linesOfCode: "small (<300)",
    containsDataLogic: false,
    containsAuthLogic: false,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [],
    pendingWork: ["Phase 3: Quick audit — small page, low risk"],
    redesignNotes: "Smallest page in the app. Good candidate for first Phase 3 task.",
  },

  // ── Login ───────────────────────────────────────────────────────────────────────
  login: {
    route: "/login",
    file: "src/app/login/page.tsx",
    status: "frozen",
    completedPhase: null,
    pendingPhase: null,
    approved: false,
    linesOfCode: "medium (300–800)",
    containsDataLogic: false,
    containsAuthLogic: true,
    containsAILogic: false,
    containsIntegrations: false,
    knownIssues: [],
    completedWork: [],
    pendingWork: [],
    redesignNotes: "FROZEN. Auth page — Supabase sign-in, magic link. Never touch in a UI pass.",
  },

} as const;

// ─── Audit summary helpers ────────────────────────────────────────────────────

/** Pages where redesign is complete */
export const COMPLETED_PAGES = Object.entries(PAGE_AUDIT)
  .filter(([, entry]) => entry.status === "complete")
  .map(([key]) => key);

/** Pages frozen — must never be touched in a UI pass */
export const FROZEN_PAGES = Object.entries(PAGE_AUDIT)
  .filter(([, entry]) => entry.status === "frozen")
  .map(([, entry]) => entry.route);

/** Pages approved and ready for next phase */
export const APPROVED_FOR_NEXT_PHASE = Object.entries(PAGE_AUDIT)
  .filter(([, entry]) => entry.approved && entry.pendingPhase !== null)
  .map(([, entry]) => ({ route: entry.route, phase: entry.pendingPhase }));

/** Pages not yet started */
export const PENDING_AUDIT = Object.entries(PAGE_AUDIT)
  .filter(([, entry]) => entry.status === "not-started")
  .map(([, entry]) => entry.route);
