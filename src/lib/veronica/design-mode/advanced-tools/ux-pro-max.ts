/**
 * UI/UX Pro Max — Vault Co UX Decision Framework
 *
 * Governance-only module. Defines UX principles, decision rules, and approval
 * checklists for all Vault Co portal flows. Not a package, not installed, not
 * executable at runtime. Import to reference canonical UX decisions during
 * Veronica Design Mode audits, proposals, and design reviews.
 *
 * Coverage:
 *   Dashboard · CRM/Table · AI Console · Onboarding · Empty/Loading/Error
 *   Mobile · Conversion · Accessibility · Decision Hierarchy · Friction Reduction
 *   UX Flow Approval Checklist
 *
 * Usage rules enforced by tool-registry.ts:
 *   - Rules-only — no production changes based on this file alone
 *   - Direct redesign is forbidden as an output of applying these rules
 *   - Any UX flow change requires the UX_FLOW_APPROVAL_CHECKLIST to be completed
 */

// ── Dashboard UX Principles ───────────────────────────────────────────────────

export const DASHBOARD_UX = {
  primaryObjective:
    "The dashboard answers 'what needs my attention right now?' in under 3 seconds — without the user reading a word.",

  scanPattern: [
    "Top-left is the primary anchor — place the highest-priority metric or status summary there",
    "Secondary metrics follow F-pattern left-to-right, then down — never zig-zag",
    "Alert conditions (budget exceeded, approval needed) must appear above the fold unconditionally",
    "Aggregate KPIs precede detail — summary row always before table or sub-list",
  ],

  informationDensity: {
    rule: "Dense but not crowded — every visible element earns its place",
    panelMaxMetrics: 6,
    labelMaxLength: 28,
    valueMaxCharacters: 12,
    warningBelowPixelHeight: 48,
  },

  statusCommunication: [
    "Active/healthy: no visual noise — absence of alert IS the positive signal",
    "Degraded: amber badge + 1-line reason — no modal, no wall of text",
    "Critical: red badge + inline action button — never buried below fold",
    "Empty (no data yet): illustration + single CTA — never a blank white void",
  ],

  forbidden: [
    "Decorative charts that display no real data",
    "Welcome messages that occupy above-the-fold space",
    "Full-width hero banners on a dashboard",
    "Auto-refreshing data without a visible timestamp or spinner",
    "Multiple 'primary' CTAs competing at the same visual weight",
  ],
} as const;

// ── CRM / Table UX Principles ─────────────────────────────────────────────────

export const CRM_TABLE_UX = {
  primaryObjective:
    "Tables let users find, compare, and act on records in the fewest clicks. Speed of discovery > visual richness.",

  columnDesign: [
    "First column is always the identity anchor (client name, campaign name) — never a checkbox or ID",
    "Numeric columns right-align values — never left-align currency or percentages",
    "Status columns use VCStatusBadge — never raw text in a cell",
    "Action columns pin to the right edge and appear only on row hover (desktop) or always (mobile)",
    "Column count cap: 7 visible columns max before a 'More columns' control is needed",
  ],

  sortingAndFiltering: [
    "Default sort is always the most business-relevant order (recency or revenue desc)",
    "Active sort column must be visually indicated (sort arrow + subtle highlight)",
    "Filter state must persist across page navigation via URL params or session storage",
    "Filter count badge on the filter button — user must always know filters are active",
    "Clearing filters: one-click 'Clear all' always visible when any filter is active",
  ],

  rowInteraction: [
    "Row click navigates to detail — never triggers an in-line action without explicit secondary control",
    "Destructive actions (delete, archive) require a confirmation step — never on single click",
    "Bulk actions appear in a contextual toolbar only when rows are selected — never always-visible",
    "Hover state provides just enough affordance to reveal row actions — no full-row color fill",
  ],

  paginationAndScroll: [
    "Prefer pagination over infinite scroll for tables with actionable rows",
    "Page size options: 10, 25, 50 — 25 is default",
    "Current page and total count always visible: 'Showing 26–50 of 143'",
    "No table-within-a-table nesting — use drill-down navigation instead",
  ],

  emptyTableRule:
    "Empty table must explain WHY it is empty and offer a single recovery action — not just 'No results'.",

  forbidden: [
    "Truncating names in the identity column without a tooltip fallback",
    "Displaying loading spinners in individual cells instead of a full skeleton row",
    "Color-coding entire rows — use badge cells only",
    "Allowing column reorder without persisting the user's preference",
    "Mixing different row heights in the same table",
  ],
} as const;

// ── AI Console UX Principles ──────────────────────────────────────────────────

export const AI_CONSOLE_UX = {
  primaryObjective:
    "The AI console is a command interface, not a chat app. Outputs are structured drafts and recommendations — never conversational noise.",

  inputDesign: [
    "Input field is always at the bottom (terminal convention) — never top-mounted",
    "Submit on Enter; Shift+Enter for newline — no exceptions",
    "Input placeholder states the capability, not a filler ('Describe your campaign goal...')",
    "Typing indicator appears within 100ms of send — user must never wonder if input was received",
    "Character limit shown only when approaching the limit (within 20% of max)",
  ],

  outputDesign: [
    "Streaming output renders incrementally — never holds the full response until complete",
    "AI output sections use distinct visual containers — not plain flowing text",
    "Every output includes an explicit 'draft' or 'recommendation' label — never presented as final",
    "Approval actions appear inline with the output they relate to — never in a separate modal",
    "Error states in output are inline, labeled as AI error, and offer a retry — never silent",
  ],

  safeguards: [
    "Safety banner is always visible above the submit button — AI cannot publish, activate, or spend",
    "Mock mode notice appears in amber when AI_PROVIDER=mock — user always knows the data source",
    "Every generated draft is labeled with the model, timestamp, and provider used",
    "No auto-submission — AI generations always require a conscious user action to advance state",
  ],

  historyAndContext: [
    "Session context is visible — user can see what parameters informed the current generation",
    "Previous drafts are accessible in a history sidebar — not lost on page reload",
    "Regenerate always produces a distinct variation — identical output is a failure",
  ],

  forbidden: [
    "Presenting AI output without a 'This is a draft' label",
    "Auto-advancing draft status without user action",
    "Hiding the safety banner for any reason",
    "Streaming output that renders broken markdown or unclosed code blocks",
    "Showing AI confidence scores as percentages — they mislead users into false precision",
  ],
} as const;

// ── Onboarding Flow Principles ────────────────────────────────────────────────

export const ONBOARDING_UX = {
  primaryObjective:
    "Get the user to their first meaningful action in under 2 minutes. Every onboarding step must unblock a real workflow.",

  progressDesign: [
    "Show total steps and current position from step 1 — never hide how long onboarding takes",
    "Each step has a single clear objective — never two decisions on one screen",
    "Allow back-navigation to any completed step without data loss",
    "Save progress automatically after each completed step — never lose filled data on browser back",
    "Skip option must be available for non-critical configuration steps",
  ],

  copyPrinciples: [
    "Step title states the outcome, not the action ('Your first client is ready' not 'Step 3: Add Client')",
    "Helper text is one sentence max — if you need more, the feature is too complex for onboarding",
    "CTA label states exactly what happens next ('Create Client' not 'Next')",
    "Error messages in onboarding are never generic — always specific to the field and actionable",
  ],

  completionState: [
    "Onboarding completion is celebrated — a moment of positive reinforcement before the dashboard",
    "The completion screen shows the first real action they can take with what they just configured",
    "Completed onboarding steps are never shown again — no re-running completed sections",
    "Onboarding state persists in the database — completing on desktop should not re-trigger on mobile",
  ],

  forbidden: [
    "Asking for information that is not used in the first session",
    "Requiring integration configuration before the user has seen any value",
    "Displaying an empty dashboard with no guidance as the 'completed' state",
    "Multi-page modal wizards with no URL — back button always breaks them",
  ],
} as const;

// ── Empty / Loading / Error State Standards ───────────────────────────────────

export const STATE_UX = {
  emptyStates: {
    rule: "Every empty state has three elements: a reason, an illustration or icon, and one CTA.",
    reasons: [
      "'No clients yet' → different message than 'No clients match your filter'",
      "'No campaigns for this client' → different from 'Campaigns are loading'",
      "The reason must be derived from the actual data state — not a generic 'Nothing here'",
    ],
    illustration:
      "Use a simple line icon from lucide-react — no heavy SVG illustrations that slow paint.",
    cta: "One CTA only. If the user can't fix the empty state, the CTA links to documentation.",
    forbidden: [
      "Empty containers with no content at all",
      "Multiple CTAs on an empty state",
      "Empty states that look the same regardless of why they are empty",
    ],
  },

  loadingStates: {
    rule: "Loading states mirror the shape of the content they replace — skeleton first, spinner only for sub-1s loads.",
    skeleton: [
      "Skeleton must match column count, row count, and approximate content widths",
      "Skeleton uses Tailwind animate-pulse on bg-[rgba(255,255,255,0.05)] blocks",
      "Skeleton must be wrapped in motion-safe: to respect reduced-motion",
      "Never show a skeleton for longer than 8 seconds — replace with error state after timeout",
    ],
    spinner:
      "Spinner only for operations expected to complete in under 1 second (button click, form submit, dialog open).",
    forbidden: [
      "Full-page loading spinners with no content visible",
      "Spinners on data tables — always use skeleton rows",
      "Loading states that don't convey how much is left (unbounded)",
    ],
  },

  errorStates: {
    rule: "Error states tell the user what broke, who is responsible, and what they can do next.",
    levels: {
      inline: "Field-level validation — appears below the input, red text, icon, specific reason",
      section: "Section failed to load — within the panel, with a retry button",
      page: "Full page failure — centered, branded, with a primary action (retry or go home)",
      toast: "Non-blocking background operation failure — appears top-right, auto-dismisses in 5s",
    },
    copyRules: [
      "Never say 'Something went wrong' — specify what failed",
      "Never expose stack traces, error codes, or raw API messages in user-facing text",
      "Always include a retry action unless the error is unrecoverable",
      "Distinguish between user error and system error in the message tone",
    ],
    forbidden: [
      "Silent errors — if something failed, the user must be told",
      "Errors that look identical to empty states",
      "Error messages that blame the user for a system failure",
      "Persistent error banners that the user cannot dismiss",
    ],
  },
} as const;

// ── Mobile Usability Rules ────────────────────────────────────────────────────

export const MOBILE_UX = {
  primaryObjective:
    "Mobile users are checking status and approving work — not building campaigns. Optimize for read and approve, not full authoring.",

  breakpoints: {
    mobile: "< 640px — single column, stacked navigation, bottom action bars",
    tablet: "640px–1024px — two-column grid where possible, side nav collapses",
    desktop: "> 1024px — full layout, side nav visible, all columns active",
  },

  touchTargets: {
    minimumHeight: 44,
    minimumWidth: 44,
    recommendedHeight: 48,
    spacingBetweenTargets: 8,
    note: "44px is Apple HIG minimum. 48px is Google Material minimum. Use 44px as hard floor.",
  },

  navigation: [
    "Bottom tab bar on mobile for primary navigation — not hamburger menu",
    "Back navigation must always be in the top-left on mobile — never buried",
    "Swipe-to-dismiss is a bonus, not a replacement for an explicit close button",
    "Deep-linked pages must work standalone — no dependency on parent page state",
  ],

  contentPriority: [
    "Above-fold content on mobile must be the single most important action or status",
    "Secondary actions collapse into a '...' overflow menu on mobile",
    "Tables on mobile collapse to card view — not horizontally scrollable tables",
    "Forms on mobile: one field per row, large labels, autofocus on first field",
  ],

  forbidden: [
    "Hover-only affordances — mobile has no hover state",
    "Fixed-width containers that overflow at 390px",
    "Font sizes below 14px for body copy on mobile",
    "Modals that are taller than the viewport on mobile",
    "Gestures as the only way to access a feature — always provide a button fallback",
  ],
} as const;

// ── Conversion UX Rules ───────────────────────────────────────────────────────

export const CONVERSION_UX = {
  primaryObjective:
    "Move users from 'viewing' to 'deciding' to 'acting' with the fewest friction points. Every unnecessary step is revenue lost.",

  ctaDesign: [
    "One primary CTA per view — visual hierarchy must make it obvious",
    "CTA label is a verb + outcome: 'Approve Campaign', 'Create Client', 'Launch Analysis'",
    "CTA is never disabled without explaining why, inline, next to the button",
    "Loading state on CTA shows a spinner and disables re-click — no double-submit possible",
    "Destructive CTAs use a distinct color (danger token) and require a confirmation step",
  ],

  approvalFlows: [
    "Approval action and the thing being approved must be visible simultaneously — no scrolling to find the object",
    "Approval confirmation is inline, not a modal, for actions with visible context",
    "Rejected items show the rejection reason inline, with a clear path to revise and resubmit",
    "Approval history is always visible on the item — who approved, when, what state they moved it to",
  ],

  frictionAudit: {
    description:
      "Before shipping any flow, count the clicks from entry to completion. If the count exceeds these thresholds, the flow must be simplified.",
    thresholds: {
      "generate-campaign-draft": 3,
      "approve-campaign": 2,
      "add-client": 4,
      "run-intelligence-extract": 2,
      "view-client-analytics": 2,
    },
  },

  progressFeedback: [
    "Multi-step forms show progress — user always knows where they are",
    "Long-running server operations show a progress indicator with estimated time",
    "Completed actions produce immediate positive feedback (success toast, state change)",
    "Success state is visually distinct from the starting state — no ambiguity about whether it worked",
  ],

  forbidden: [
    "Required form fields that are only relevant in edge cases",
    "Confirmation dialogs for non-destructive primary actions",
    "Success redirects that lose context (redirecting to list when user needs to see the created item)",
    "CTAs that appear below the fold when the page first loads",
  ],
} as const;

// ── Accessibility Basics ──────────────────────────────────────────────────────

export const ACCESSIBILITY_UX = {
  primaryObjective:
    "WCAG 2.1 AA compliance is the floor. All new components must meet it before production promotion.",

  colorContrast: {
    bodyText: "4.5:1 minimum against background",
    largeText: "3:1 minimum (text ≥ 18pt or 14pt bold)",
    uiComponents: "3:1 for interactive element boundaries against adjacent colors",
    note: "Vault Co dark theme: var(--t-text) on var(--t-surface) is pre-verified. Custom colors must be checked.",
  },

  keyboardNavigation: [
    "All interactive elements reachable by Tab — no keyboard traps",
    "Focus indicator visible: min 2px outline in var(--c-blue) on dark surfaces",
    "Modal dialogs trap focus within the modal — Tab cycles through modal elements only",
    "Escape closes all dismissible overlays (modals, drawers, dropdowns)",
    "Complex widgets (data tables, date pickers) follow ARIA authoring practice patterns",
  ],

  screenReaderSupport: [
    "Images and icons that convey information have descriptive alt text or aria-label",
    "Decorative icons use aria-hidden='true' — no screen reader noise",
    "Dynamic content updates use aria-live='polite' for non-urgent updates",
    "Form fields have explicit label associations — no placeholder-as-label",
    "Status badges include accessible text: VCStatusBadge renders a visually-hidden label",
  ],

  semanticMarkup: [
    "Page sections use landmark elements: <main>, <nav>, <header>, <aside>",
    "Heading hierarchy is sequential: h1 → h2 → h3 — never skip levels",
    "Data tables use <th> with scope attribute — never use <div> grids to replicate table semantics",
    "Buttons are <button> — never <div onClick>. Links navigate, buttons act.",
  ],

  forbidden: [
    "Color as the only differentiator of state — always pair with icon or text",
    "Removing the browser focus ring without providing a visible replacement",
    "onClick handlers on non-interactive elements without role and keyboard support",
    "Auto-playing media without controls",
    "Timeout-driven UI changes with no user warning",
  ],
} as const;

// ── Decision Hierarchy Rules ──────────────────────────────────────────────────

export const UX_DECISION_HIERARCHY = {
  description:
    "When Veronica Design Mode evaluates a UX proposal, apply these rules in order. Earlier rules override later ones.",

  rules: [
    {
      priority: 1,
      name: "Data Honesty First",
      rule: "A UX pattern that requires fabricated or misleading data is rejected regardless of visual quality.",
      example: "A progress bar with no real progress source fails even if it looks beautiful.",
    },
    {
      priority: 2,
      name: "Accessibility Floor",
      rule: "A pattern that fails WCAG 2.1 AA contrast or keyboard navigation is rejected regardless of brand alignment.",
      example: "A ghost button with 2:1 contrast fails even if it matches the Vault Co palette.",
    },
    {
      priority: 3,
      name: "Mobile Usability",
      rule: "A pattern that breaks at 390px viewport width is rejected regardless of desktop quality.",
      example: "A 6-column stat grid with no responsive collapse fails even if it passes all other checks.",
    },
    {
      priority: 4,
      name: "Conversion Friction",
      rule: "A flow that exceeds the click-count threshold for its operation type is flagged and must be simplified before approval.",
      example: "A 7-step campaign draft flow fails the friction audit even if each step is beautifully designed.",
    },
    {
      priority: 5,
      name: "Brand Alignment",
      rule: "A pattern that violates Vault Co design principles (light surfaces, wrong accent, excessive animation) is flagged for revision.",
      example: "A card with rounded-3xl corners is flagged even if it passes all functional checks.",
    },
    {
      priority: 6,
      name: "Impeccable Audit Score",
      rule: "After passing all priority 1–5 checks, an Impeccable UI audit score gates promotion. Score ≥ 4.0 to promote. Score < 3.0 holds in sandbox.",
      example: "A component that passes all rule checks but scores 2.8 on the audit stays in sandbox with a Level 3 recommendation.",
    },
  ],
} as const;

// ── Friction Reduction Rules ──────────────────────────────────────────────────

export const FRICTION_REDUCTION_RULES = {
  primaryObjective:
    "Every click, every confirmation, every form field that isn't essential is friction. Remove it or it becomes attrition.",

  smartDefaults: [
    "Pre-populate form fields from the last used value where safe and appropriate",
    "Default sort and filter state matches the most common user intent — not alphabetical",
    "Default date ranges for analytics are 'last 30 days' — not 'today' or 'all time'",
    "Default currency format matches the user's locale — never require manual selection",
  ],

  progressiveDisclosure: [
    "Show essential fields first — advanced configuration is collapsible or on a second step",
    "Inline help text appears only when the field has focus — not always-visible",
    "Secondary actions (export, archive, duplicate) live in a contextual '...' menu — not always-visible buttons",
    "Error messages show after the user has left the field (onBlur) — not while typing",
  ],

  autoSave: [
    "Forms with more than 3 fields auto-save a draft on any change — no data loss on navigation",
    "Auto-save status is displayed ('Saved 3s ago') — user always knows their work is safe",
    "Auto-save does not trigger for destructive or irreversible actions",
  ],

  optimisticUI: [
    "Status changes (approve, archive) update the UI immediately — don't wait for the server",
    "Optimistic updates include a visible undo action for the first 5 seconds",
    "If the server rejects the action, revert the UI and show an inline error — never a full-page error",
  ],

  forbidden: [
    "Confirmation dialogs for actions the user can undo",
    "Requiring re-entry of information the system already has",
    "Page reloads where a partial update would suffice",
    "CAPTCHAs or security challenges in authenticated flows",
    "Required fields that are not used in the core workflow",
  ],
} as const;

// ── UX Flow Approval Checklist ────────────────────────────────────────────────

export interface UXFlowApprovalItem {
  id: string;
  category: string;
  check: string;
  blockingIfFailed: boolean;
}

export const UX_FLOW_APPROVAL_CHECKLIST: UXFlowApprovalItem[] = [
  // Data Honesty
  { id: "da-01", category: "Data Honesty", check: "Every value rendered in this flow has a named real data source", blockingIfFailed: true },
  { id: "da-02", category: "Data Honesty", check: "Empty and null states render cleanly without misleading placeholders", blockingIfFailed: true },
  { id: "da-03", category: "Data Honesty", check: "Trend indicators, scores, and deltas are conditional on real data fields", blockingIfFailed: true },

  // Accessibility
  { id: "ac-01", category: "Accessibility", check: "All text elements pass WCAG 2.1 AA contrast ratio", blockingIfFailed: true },
  { id: "ac-02", category: "Accessibility", check: "All interactive elements are reachable by keyboard", blockingIfFailed: true },
  { id: "ac-03", category: "Accessibility", check: "Focus ring is visible on all interactive elements in this flow", blockingIfFailed: true },
  { id: "ac-04", category: "Accessibility", check: "Form fields have explicit label associations", blockingIfFailed: true },
  { id: "ac-05", category: "Accessibility", check: "Dynamic content uses appropriate aria-live regions", blockingIfFailed: false },

  // Mobile
  { id: "mb-01", category: "Mobile", check: "Flow renders without horizontal overflow at 390px viewport", blockingIfFailed: true },
  { id: "mb-02", category: "Mobile", check: "All touch targets are ≥ 44px height on mobile", blockingIfFailed: true },
  { id: "mb-03", category: "Mobile", check: "Multi-column grids collapse correctly on mobile", blockingIfFailed: true },
  { id: "mb-04", category: "Mobile", check: "All text is readable at mobile viewport without truncation of critical labels", blockingIfFailed: false },

  // Conversion
  { id: "cv-01", category: "Conversion", check: "Click count from entry to completion is within the flow's threshold", blockingIfFailed: false },
  { id: "cv-02", category: "Conversion", check: "One primary CTA is visually dominant on every step", blockingIfFailed: false },
  { id: "cv-03", category: "Conversion", check: "CTA labels are verb + outcome — no ambiguous labels like 'Next' or 'Continue'", blockingIfFailed: false },
  { id: "cv-04", category: "Conversion", check: "Loading states on submit actions prevent double-submission", blockingIfFailed: true },

  // States
  { id: "st-01", category: "States", check: "Empty state has reason + icon + single CTA", blockingIfFailed: false },
  { id: "st-02", category: "States", check: "Loading state uses skeleton (not spinner) for content areas", blockingIfFailed: false },
  { id: "st-03", category: "States", check: "Error state specifies what failed and offers a recovery action", blockingIfFailed: false },
  { id: "st-04", category: "States", check: "Success state is visually distinct from starting state", blockingIfFailed: false },

  // Brand
  { id: "br-01", category: "Brand", check: "No light surfaces in dark theme render path", blockingIfFailed: true },
  { id: "br-02", category: "Brand", check: "Fonts are only Rajdhani (values/headings) and Manrope (body)", blockingIfFailed: true },
  { id: "br-03", category: "Brand", check: "Animations respect prefers-reduced-motion", blockingIfFailed: true },
  { id: "br-04", category: "Brand", check: "No infinite animations on functional UI elements", blockingIfFailed: true },

  // Impeccable Audit Gate
  { id: "ia-01", category: "Impeccable Audit", check: "Impeccable UI audit run and score recorded in the proposal", blockingIfFailed: false },
  { id: "ia-02", category: "Impeccable Audit", check: "Score ≥ 4.0 (pass) or score ≥ 3.0 with documented remediation plan", blockingIfFailed: false },
  { id: "ia-03", category: "Impeccable Audit", check: "No score-1 blockers remain unresolved", blockingIfFailed: true },
] as const;

export type ApprovalItemId = (typeof UX_FLOW_APPROVAL_CHECKLIST)[number]["id"];

export interface UXFlowApprovalResult {
  flowName: string;
  reviewedAt: string;
  reviewer: string;
  results: Array<{ id: ApprovalItemId; passed: boolean; notes?: string }>;
  blockingFailures: string[];
  approved: boolean;
}

export function evaluateUXFlowApproval(
  flowName: string,
  reviewer: string,
  results: Array<{ id: ApprovalItemId; passed: boolean; notes?: string }>
): UXFlowApprovalResult {
  const blockingFailures: string[] = [];

  for (const result of results) {
    if (!result.passed) {
      const item = UX_FLOW_APPROVAL_CHECKLIST.find((i) => i.id === result.id);
      if (item?.blockingIfFailed) {
        blockingFailures.push(`${item.id}: ${item.check}`);
      }
    }
  }

  return {
    flowName,
    reviewedAt: new Date().toISOString(),
    reviewer,
    results,
    blockingFailures,
    approved: blockingFailures.length === 0,
  };
}

export function formatUXApprovalSummary(result: UXFlowApprovalResult): string {
  const status = result.approved ? "APPROVED" : "BLOCKED";
  const blockers =
    result.blockingFailures.length > 0
      ? `\nBlocking failures:\n${result.blockingFailures.map((b) => `  ✗ ${b}`).join("\n")}`
      : "";

  return [
    `UX Flow Approval — ${result.flowName}`,
    `Status: ${status} | Reviewer: ${result.reviewer}`,
    `Reviewed: ${result.reviewedAt}`,
    blockers,
  ]
    .filter(Boolean)
    .join("\n");
}
