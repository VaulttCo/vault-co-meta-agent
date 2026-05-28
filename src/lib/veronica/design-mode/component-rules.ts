/**
 * Vault Co Component Rules
 *
 * Governs which component to use for every UI pattern in the portal.
 * Read this before building, modifying, or replacing any UI element.
 *
 * Source files referenced:
 *   - src/components/ui/VaultUI.tsx        — primary component library
 *   - src/components/ui/Badge.tsx          — client status badges
 *   - src/components/ui/StatCard.tsx       — upgraded stat card (no active imports)
 *   - src/components/ui/PageHeader.tsx     — page-level title + action row
 *   - src/components/ui/button.tsx         — shadcn Button primitive (foundation only)
 *   - src/app/globals.css                  — CSS utility classes
 */

// ─── Panel and section wrappers ───────────────────────────────────────────────

export const PANEL_RULES = {
  primaryWrapper: "VCPanel from VaultUI.tsx",
  cssClass: "vc-panel",
  when: [
    "Every distinct content block on a page",
    "Tables wrapped in a rounded container",
    "Stat grids that need a surface background",
    "Any area that previously used: SectionCard, vc-card, raw surface div",
  ],
  whenNot: [
    "Command Hub portal cards (use custom gradient cards — see page.tsx)",
    "Inline sub-sections inside a VCPanel (use plain divs with border-b)",
    "Full-screen modals (use fixed overlay + rounded-xl directly)",
    "The Hermes prompt terminal area",
  ],
  accentProp: {
    blue:   "Veronica AI panels — client intelligence, fulfillment, approval queue",
    gold:   "Revenue Dashboard panels",
    orange: "Warning or onboarding context panels",
    green:  "Live connection or success confirmation panels",
    red:    "Error or blocked state panels",
    purple: "Victoria AI panels",
  },
  exceptions: {
    "revenue-dashboard/clients/[clientId]/page.tsx": "Uses inline StatCard — different layout contract, gold theme. Do not replace.",
    "ai-agent/console/page.tsx": "Complex interactive console. Panels not yet migrated. Do not touch until Phase 3.",
    "settings/page.tsx": "Integration auth forms. Do not touch.",
    "victoria/page.tsx": "Live AI session page. Do not touch.",
    "operator-queue/page.tsx": "Complex task management. Not yet migrated.",
  },
} as const;

export const PANEL_HEADER_RULES = {
  component: "VCPanelHeader from VaultUI.tsx",
  cssClass: "vc-panel-header",
  rules: [
    "Always the first child element inside a VCPanel",
    "icon prop: use lucide-react icon, color defaults to #0081f2",
    "title prop: short noun phrase, no verbs, no periods",
    "action prop: use VCActionLink for 'View all' links, raw badge spans for status labels",
    "live prop: adds animated green pulse dot — only for real-time data panels",
    "label prop: 9px micro-label above the title for portal context (e.g. 'Veronica AI')",
  ],
  forbidden: [
    "Do not put CTAs (Add, Generate buttons) in VCPanelHeader — those belong in PageHeader.action",
    "Do not put more than one action element — keep headers uncluttered",
    "Do not use panel headers for table column headers — those use thead > tr > th",
  ],
} as const;

// ─── Stat and KPI tiles ───────────────────────────────────────────────────────

export const STAT_RULES = {
  primaryComponent: "VCStat from VaultUI.tsx",
  sharedFallback:   "StatCard from src/components/ui/StatCard.tsx (no active imports — reserve for future)",
  when: [
    "Any numeric KPI display inside a page or panel",
    "Summary grids at the top of dashboard pages",
    "Inline stat grids inside VCPanel (use size='sm')",
  ],
  sizeGuide: {
    "size='md'": "Top-of-page summary grids, standalone stat rows (default)",
    "size='sm'": "Stats inside panels (Client Intelligence, Fulfillment Pipeline, etc.)",
  },
  accentProp: "2px top border — use sparingly, only for primary/priority metrics",
  iconColorBehavior: [
    "When iconColor = '#0081f2' (default): value text renders as var(--t-text) neutral",
    "When iconColor = '#22c55e': value text renders green (active/success counts)",
    "When iconColor = '#ef4444': value text renders red (blocked/urgent counts)",
    "When iconColor = '#ff8400': value text renders orange (pending/warning counts)",
  ],
  forbiddenPatterns: [
    "Do NOT define a local StatTile or StatCard function inside a page file — use VCStat",
    "Do NOT use arbitrary inline div + Rajdhani text for a KPI — always use VCStat",
    "EXCEPTION: revenue-dashboard/clients/[clientId]/page.tsx inline StatCard — approved exception, do not change",
  ],
} as const;

// ─── Table rules ──────────────────────────────────────────────────────────────

export const TABLE_RULES = {
  wrapperClass:  "vc-panel",
  rowClass:      "vc-table-row",
  headerCellStyle: "text-[9px] font-bold uppercase tracking-widest color:var(--t-dim)",
  rowDivider:    "borderColor: var(--t-border-subtle)",

  statusIndicator: {
    pattern: "First <td> is a 3px wide colored bar (no content), matching client status color",
    colors: {
      active:     "#22c55e",
      setup:      "#0081f2",
      onboarding: "#ff8400",
      paused:     "#f59e0b",
      archived:   "#3d4f6e",
    },
    example: "<td className='p-0 w-1'><div className='w-[3px] h-full min-h-[52px] rounded-r' style={{backgroundColor: statusColor}} /></td>",
  },

  hoverBehavior: [
    "vc-table-row class applies hover:rgba(0,129,242,0.035) background automatically",
    "Last column: 'Open >' link, opacity-0 by default, opacity-70 on group-hover",
    "Do NOT add additional hover transforms or transitions to rows — keep it subtle",
  ],

  mobileRule: "min-w-[680px] on the table, overflow-x-auto on the wrapper — never hide columns on mobile",

  columnOrder: {
    clients: ["[status bar]", "Client + owner", "Market", "Status badge", "Budget", "Leads", "Booked", "CPL", "Avg Job Value", "[open link]"],
    reports: ["[row]", "Client", "Report Period", "Status", "Leads", "Booked", "CPL", "Spend", "[export]"],
  },

  forbidden: [
    "Do NOT use Tailwind's divide-y — use borderColor on individual rows instead",
    "Do NOT nest another table inside a table row",
    "Do NOT add background-color to thead — it shares the panel surface",
    "Do NOT use <table> for non-tabular data — use flex lists for task queues",
  ],
} as const;

// ─── Filter and search bars ───────────────────────────────────────────────────

export const FILTER_RULES = {
  searchComponent:  "VCSearchInput from VaultUI.tsx",
  filterComponent:  "VCFilterBar from VaultUI.tsx",
  cssSearchClass:   "vc-input",
  cssFilterClass:   "vc-filter-pill + .active",

  placement: "Always above the table/list it filters — flex row with gap-2",
  searchWidth: "flex-1 min-w-[160px] max-w-xs",
  noClientSideFilterDelay: "Filter on every keystroke — no debounce for <1000 rows",

  forbidden: [
    "Do NOT use onFocus/onBlur to apply style objects to inputs — use vc-input CSS class",
    "Do NOT use a dropdown select for status filters — use VCFilterBar pill tabs",
    "Do NOT add a search icon inside VCFilterBar — VCSearchInput already has one",
  ],
} as const;

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const BUTTON_RULES = {
  hierarchy: {
    primary:   "Orange (#ff8400) — Add Client, Generate All, Submit, Save",
    secondary: "Blue (#0081f2) — Open Console, Enter Module, secondary AI actions",
    tertiary:  "Ghost (transparent + var(--t-border)) — Cancel, Close",
    danger:    "#ef4444 background — Delete, Remove (rare, confirm first)",
    disabled:  "opacity-50 + cursor-not-allowed on any variant",
  },

  components: {
    pageActions:    "Raw <button> with backgroundColor inline — fine for PageHeader.action",
    insidePanels:   "VCButton from VaultUI.tsx — use variant prop",
    shadcnPrimitive:"Button from src/components/ui/button.tsx — only as a base for future Radix triggers (Dialog, Tooltip, Sheet)",
    CTAOnHub:       "Custom gradient button — see Command Hub page.tsx only",
  },

  sizing: {
    standard: "px-4 py-2 text-[13px]",
    small:    "px-3 py-1.5 text-[12px]",
    icon:     "w-7 h-7 or w-8 h-8 flex items-center justify-center",
  },

  forbidden: [
    "Do NOT use large buttons (py-4+) — keep them tight and professional",
    "Do NOT use rounded-full on buttons — use rounded-lg",
    "Do NOT add button icons larger than size={14} — use size={13} or size={12}",
    "Do NOT show more than 2 primary actions in the same row",
  ],
} as const;

// ─── Badges and status indicators ────────────────────────────────────────────

export const BADGE_RULES = {
  clientStatusBadge: {
    component: "Badge from src/components/ui/Badge.tsx",
    when: "Client status in tables (active, setup, onboarding, paused, archived)",
    variants: "success | warning | danger | neutral | blue | orange",
    doNotReplace: "7 pages import Badge.tsx directly — do not remove or rename the file",
  },

  generalBadge: {
    component: "VCStatusBadge from VaultUI.tsx",
    when: "Any status/state label in panel headers, hero sections, modals",
    extraVariants: "purple, gold (not in Badge.tsx)",
    dotProp: "Add dot={true} for live/real-time states only",
  },

  chip: {
    component: "VCChip from VaultUI.tsx",
    when: "Category tags, source indicators (GHL, Meta), type labels inside rows",
    sizeNote: "Smaller than VCStatusBadge — 9px, no dot option",
  },

  inline: {
    pattern: "For one-off badges not worth a component: px-1.5 py-0.5 rounded-full text-[9px] font-bold + inline color",
    rule: "Acceptable only in page-local JSX — extract to VCStatusBadge if used 3+ times",
  },

  forbidden: [
    "Do NOT use emoji as status indicators — use colored dots or icons",
    "Do NOT use green badges for non-live states",
    "Do NOT put badges in table body cells for anything other than status",
  ],
} as const;

// ─── Dashboard hierarchy ──────────────────────────────────────────────────────

export const DASHBOARD_HIERARCHY = {
  /**
   * The visual weight of information must decrease top-to-bottom.
   * Operators should see the most important information first.
   */
  pageOrder: [
    "1. PageHeader — page title + optional section label + single action",
    "2. Summary stat row — 2–4 VCStat tiles (size='md') in a horizontal grid",
    "3. Primary panels — VCPanel with VCPanelHeader, most critical data first",
    "4. Secondary panels — supporting data, recent activity, operator queue",
    "5. Quick actions — navigation links, not CTAs (never at the top)",
  ],

  commandHub: {
    description: "Special full-screen standalone page — exempt from standard hierarchy",
    structure: "Header → 3 portal cards → system status strip → footer",
    noSidebar: true,
    noTopbar: true,
  },

  sectionWeighting: {
    weight1: "Blocked/urgent items — always surfaced first (red/orange indicators)",
    weight2: "Live data requiring action (pending approvals, open tasks)",
    weight3: "Overview stats (total clients, active count)",
    weight4: "Historical/reference data (reports, past campaigns)",
  },

  maxPanelsPerPage: 6,
  maxStatsPerRow: 4,
  maxColumnsInTable: 9,

  rules: [
    "Never put a table above the stat summary row",
    "Never put Quick Actions above the primary data panels",
    "Approval counts and blocked items must be visible without scrolling on desktop",
    "The most important number on a page should be in the top-left stat",
  ],
} as const;

// ─── shadcn/ui usage rules ────────────────────────────────────────────────────

export const SHADCN_RULES = {
  installed: {
    "src/components/ui/button.tsx": "Foundation primitive — do not use for Vault Co CTAs",
  },

  approvedForNextInstall: [
    "Dialog   — for modal confirmations (replace current custom modals)",
    "Tooltip  — for truncated text labels in tables",
    "Sheet    — for mobile panel slide-ins",
    "Select   — for form dropdowns when vc-input select styling is insufficient",
    "Tabs     — if sub-navigation inside a page is needed",
  ],

  installProcess: [
    "1. Run: pnpm dlx shadcn add <component>",
    "2. Review generated file in src/components/ui/<component>.tsx",
    "3. Check if globals.css was modified — revert any --background/--foreground/--primary injections",
    "4. Apply Vault Co styling to the component variants (use COLORS from design-principles.ts)",
    "5. Add a usage note to DESIGN_SYSTEM.md",
    "6. Run pnpm run build before committing",
  ],

  cssVariableConflictWarning: [
    "shadcn injects: --background, --foreground, --primary, --secondary, --muted, --accent, --border, --ring",
    "These CONFLICT with our --t-bg, --t-text, --t-muted, --t-border, --t-surface tokens",
    "Always check globals.css after running shadcn add and remove any injected conflicting vars",
  ],

  forbidden: [
    "Do NOT use shadcn Button as a Vault Co CTA — it uses Tailwind color classes, not our tokens",
    "Do NOT copy shadcn component CSS variables directly into globals.css",
    "Do NOT install shadcn components that ship with built-in light/dark toggle CSS — we manage themes",
  ],
} as const;

// ─── Mobile responsiveness rules ─────────────────────────────────────────────

export const MOBILE_RULES = {
  breakpoints: {
    mobile:  "< 640px  (default, no prefix)",
    tablet:  "≥ 640px  (sm: prefix)",
    desktop: "≥ 1024px (lg: prefix)",
  },

  sidebar: "Hidden on mobile, slide-in via hamburger. lg:static. Width: 228px.",
  topbar:  "Always visible. Hamburger button visible on <lg. Height: 64px.",

  gridCollapseRules: {
    "grid-cols-2 sm:grid-cols-4":       "2-up stat grids",
    "grid-cols-1 md:grid-cols-2":       "Two-column panel grids",
    "grid-cols-1 md:grid-cols-3":       "Three-column panel grids (Command Hub cards)",
    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5": "5-up status strip grids",
  },

  tables: {
    rule: "Never collapse or hide table columns on mobile",
    solution: "overflow-x-auto on wrapper + min-w-[680px] on <table>",
    mobileMinWidth: "680px for standard client/report tables",
  },

  textTruncation: [
    "Nav labels: truncate",
    "Table client name: font-semibold (no truncate — it's the primary key)",
    "Panel titles in VCPanelHeader: truncate",
    "Topbar page subtitle: hidden on mobile (hidden sm:block)",
  ],

  touchTargets: [
    "Minimum touch target: 44×44px for interactive elements on mobile",
    "Table rows: min-height 52px (py-3.5 on td achieves this)",
    "Filter pills: py-1.5 minimum",
    "Icon buttons: w-8 h-8 minimum",
  ],

  forbidden: [
    "Do NOT use fixed pixel widths on content areas — use max-w-* + w-full",
    "Do NOT use hover-only states for functionality — all interactive elements need tap states",
    "Do NOT hide table columns with hidden sm:table-cell — use horizontal scroll instead",
    "Do NOT use overflow-hidden on the page wrapper — it breaks mobile scroll",
  ],
} as const;

// ─── Anti-patterns ────────────────────────────────────────────────────────────

export const ANTI_PATTERNS = {
  styling: [
    "Hardcoded #0D1520 or rgba(0,129,242,0.15) — use CSS tokens",
    "onFocus/onBlur JS style mutation — use vc-input CSS class",
    "Defining local StatTile/StatCard in a page — use VCStat",
    "Creating a new SectionCard-style wrapper — use VCPanel",
    "Using tailwind's bg-white or bg-gray-* on any element",
    "Using text-white — use text-[var(--t-text)] or specific color values",
    "Using rounded-2xl for panels — panels use rounded-xl (12px)",
    "space-y-8 or space-y-10 between sections — max is space-y-5",
  ],

  layout: [
    "Putting buttons inside VCPanelHeader when they belong in PageHeader.action",
    "Nesting VCPanel inside VCPanel — use borderColor dividers instead",
    "Using min-h-screen on page content (breaks mobile scroll)",
    "Centering content inside tables with text-center — align-left except numeric columns",
    "Adding padding to the table element itself — pad the wrapper or cells",
  ],

  motion: [
    "CSS animation on static/non-interactive elements",
    "Framer Motion on table rows — too much motion for data-dense UI",
    "Looping animations beyond pulse/dot indicators",
    "Transition duration > 300ms for micro-interactions",
    "animatePresence wrapping a list of 10+ items (performance risk)",
  ],

  accessibility: [
    "Icon-only buttons without aria-label or title",
    "Color as the only status indicator — always pair color with text/icon",
    "Removing focus-visible styling",
    "Using div with onClick instead of button",
  ],

  architecture: [
    "Adding new inline CSS-in-JS where a CSS class exists in globals.css",
    "Importing framer-motion in a Server Component — must be 'use client'",
    "Adding UI state (useState for open/close) in a Server Component",
    "Putting data-fetching logic inside a UI component file",
  ],
} as const;
