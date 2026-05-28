/**
 * Vault Co Design Principles
 *
 * Canonical source of truth for all visual decisions in the portal.
 * These constants mirror the CSS tokens in src/app/globals.css exactly.
 * Import from here when you need design values in TypeScript
 * (e.g. dynamic Framer Motion color targets, test assertions).
 *
 * DO NOT use these values as inline React styles — always prefer CSS classes
 * and CSS custom properties. These exist for tooling and governance only.
 */

// ─── Brand identity ───────────────────────────────────────────────────────────

export const BRAND = {
  name: "Vault Co",
  product: "Veronica AI Command Portal",
  voice: "premium dark luxury AI operating system",
  notSaaS: true,
} as const;

/**
 * The portal must always feel like a command center operated by professionals,
 * not a generic SaaS dashboard. Every visual decision is filtered through:
 *   1. Does this feel like a $10k/mo agency tool?
 *   2. Does this reinforce that Veronica is a serious AI system?
 *   3. Would this feel at home on a Bloomberg terminal or a high-ticket ops room?
 */
export const DESIGN_PHILOSOPHY = [
  "Tight spacing — no wasted space, nothing airy or 'inviting'",
  "Dark base always — light mode is warm parchment, not a bright inversion",
  "Restraint over decoration — one glow, one accent, not both",
  "Typography does the heavy lifting — Rajdhani for authority, Manrope for clarity",
  "Color carries meaning — blue=active/AI, gold=revenue/priority, orange=action/warn, green=live/success",
  "Motion is purposeful — only on state transitions, never decorative looping",
  "Mobile-first — every layout is designed for 375px first, then expanded",
] as const;

// ─── Color system ─────────────────────────────────────────────────────────────

/**
 * Raw color values — these are the actual hex/rgba from globals.css @theme inline.
 * Grouped by semantic role.
 */
export const COLORS = {
  // ── Brand primaries ──
  blue:         "#0081f2",   // active nav, primary CTA, AI-related glow, focus rings
  blueBright:   "#0070d4",   // blue hover state
  blueLight:    "#4aabff",   // blue text on dark (readable at small sizes)

  orange:       "#ff8400",   // submit/add buttons, warning badges, onboarding
  orangeBright: "#e07600",   // orange hover state

  gold:         "#c9a84c",   // Revenue Dashboard ONLY — partner earnings, priority
  goldLight:    "#e8c97a",   // gold hover state

  // ── Semantic states ──
  success:   "#22c55e",  // live, active, approved, connected
  warning:   "#f59e0b",  // paused, pending, needs review
  danger:    "#ef4444",  // error, blocked, urgent, rejected
  purple:    "#a78bfa",  // Victoria AI, projections, skill badges
  purpleText:"#b89eff",  // purple text on dark

  // ── Backgrounds (dark theme) ──
  bgPage:    "#05070B",  // outermost page background
  surface:   "#0D1520",  // card/panel background  (--t-surface)
  surface2:  "#0f1a28",  // nested elements         (--t-surface-2)
  surface3:  "#152030",  // deeply nested           (--t-surface-3)
  sidebarBg: "#060a10",  // sidebar is darker than panels
  inputBg:   "#0f1a28",  // form inputs             (--t-input-bg)

  // ── Borders (dark theme) ──
  border:       "rgba(0,129,242,0.15)",  // default border    (--t-border)
  borderSubtle: "rgba(0,129,242,0.08)",  // table row dividers (--t-border-subtle)
  borderStrong: "rgba(0,129,242,0.25)",  // active/hover border
  borderNav:    "rgba(0,129,242,0.12)",  // sidebar/header borders

  // ── Text (dark theme) ──
  text:     "#f8f8f7",   // primary heading/value text    (--t-text)
  textBody: "#e2e8f0",   // body/description text         (--t-text-body)
  muted:    "#6b7a99",   // secondary/placeholder text    (--t-muted)
  dim:      "#3d4f6e",   // decorative/ghost text         (--t-dim)
} as const;

/**
 * Glow values — semi-opaque overlays for hover effects and icon rings.
 * Never use glow on static non-interactive elements.
 */
export const GLOWS = {
  blue:   { bg: "rgba(0,129,242,0.10)",   border: "rgba(0,129,242,0.22)",   shadow: "0 0 20px rgba(0,129,242,0.15)"   },
  orange: { bg: "rgba(255,132,0,0.10)",   border: "rgba(255,132,0,0.22)",   shadow: "0 0 20px rgba(255,132,0,0.15)"   },
  gold:   { bg: "rgba(201,168,76,0.10)",  border: "rgba(201,168,76,0.22)",  shadow: "0 0 20px rgba(201,168,76,0.15)"  },
  green:  { bg: "rgba(34,197,94,0.10)",   border: "rgba(34,197,94,0.22)",   shadow: "0 0 20px rgba(34,197,94,0.15)"   },
  red:    { bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.22)",   shadow: "0 0 20px rgba(239,68,68,0.15)"   },
  purple: { bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.22)", shadow: "0 0 20px rgba(167,139,250,0.15)" },
} as const;

// ─── Color usage rules ────────────────────────────────────────────────────────

export const COLOR_RULES = {
  blue: [
    "Active nav item highlight",
    "Primary CTA buttons (secondary — orange is primary)",
    "AI-related icons, Veronica console UI",
    "Focus rings on inputs",
    "Glow edges on Veronica/AI panels",
    "Stat value color for neutral/blue metrics",
  ],
  orange: [
    "Primary action buttons (Add Client, Generate, Submit)",
    "Warning states and badges",
    "Onboarding flow indicators",
    "CTA on the Command Hub portal cards",
  ],
  gold: [
    "Revenue Dashboard ONLY — do not use on Veronica pages",
    "Partner earnings values and labels",
    "Revenue section dividers and accent lines",
    "Leaderboard highlights",
  ],
  green: [
    "Live/active/online status dots",
    "Approved campaign drafts",
    "Connected integration status",
    "Positive metric deltas",
  ],
  danger: [
    "Errors and failure states",
    "Blocked client launch indicators",
    "Urgent priority tasks",
    "Rejected/changes-requested approval states",
  ],
  purple: [
    "Victoria AI branding only",
    "Projection/estimate badges in Revenue Dashboard",
    "Hermes skill badges",
  ],
  forbidden: [
    "Do NOT mix gold and blue accents on the same panel",
    "Do NOT use orange as a text color on dark backgrounds (too harsh)",
    "Do NOT use purple outside Victoria AI or projection contexts",
    "Do NOT use bright white (#ffffff) text — use --t-text (#f8f8f7)",
    "Do NOT hardcode #0D1520 — use var(--t-surface)",
  ],
} as const;

// ─── Typography system ────────────────────────────────────────────────────────

export const TYPOGRAPHY = {
  fonts: {
    heading: "Rajdhani, sans-serif",  // --font-rajdhani: authority, KPIs, section titles
    body:    "Manrope, sans-serif",   // --font-manrope: body text, labels, nav items
    mono:    "ui-monospace, monospace", // terminal output, code blocks
  },

  sizes: {
    // Headings (Rajdhani)
    pageTitle:    "22–26px",   // h1 in topbar and hero sections
    sectionTitle: "18–22px",   // h2 page-level section headings
    panelTitle:   "13px",      // panel header titles (VCPanelHeader)
    kpiValue:     "22–26px",   // stat values (VCStat, StatCard)

    // Body (Manrope)
    body:         "13px",      // primary body text
    bodySmall:    "12px",      // secondary body text, descriptions
    label:        "10px",      // form labels, section micro-labels
    microLabel:   "9px",       // table headers, badge text, vc-label class
    navItem:      "13px",      // sidebar navigation items
  },

  weights: {
    bold:       700,   // headings, stat values
    semibold:   600,   // nav items, CTA text, panel titles
    medium:     500,   // body text, descriptions
    normal:     400,   // placeholder text
    microBold:  800,   // 9px labels (needs extra weight to be readable)
  },

  letterSpacing: {
    heading:    "0.01em",   // Rajdhani headings
    label:      "0.12em",   // uppercase micro-labels
    wideLabel:  "0.14em",   // vc-label class
    nav:        "0.02em",   // nav items (slight)
  },

  rules: [
    "Never set font-size below 9px — minimum is 9px for labels",
    "Rajdhani for stat values and section headers — Manrope for everything else",
    "All uppercase text must use letter-spacing: 0.10em or wider",
    "Body text max-width: ~580px in wide panels to maintain readability",
    "Truncate with 'truncate' class rather than wrapping long strings in nav/table cells",
  ],
} as const;

// ─── Spacing system ───────────────────────────────────────────────────────────

export const SPACING = {
  // Page-level spacing
  pageGap:          "space-y-5",   // between PageHeader, stat grids, panels (20px)
  pagePadding:      "p-4 sm:p-5", // PortalShell main > padding
  pageMaxWidth:     "max-w-7xl",  // standard page content constraint

  // Panel inner spacing
  panelPadding:     "p-4 or p-5",   // inside VCPanel content areas
  panelHeaderPad:   "14px 20px",    // vc-panel-header (applied by CSS)
  panelSectionGap:  "space-y-3",    // between items inside a panel

  // Grid gutters
  statGridGap:      "gap-3 or gap-4",  // between VCStat tiles
  cardGridGap:      "gap-5",           // between VCPanel siblings
  formGridGap:      "gap-3",           // between form field groups

  // Table cells
  tableCellPad:     "px-4 py-3.5",    // standard table cell padding
  tableHeaderPad:   "px-4 py-3",      // table thead th padding

  // Inline elements
  badgeGap:         "gap-1.5",   // icon + text in badges
  navItemGap:       "gap-2.5",   // icon + label in sidebar nav items
  iconRingSize:     "w-8 h-8",   // standard icon container (32×32)
  iconRingSizeLg:   "w-10 h-10", // large icon container (40×40)

  rules: [
    "Use space-y-5 (not space-y-6) between page sections — tighter = more premium",
    "Panel padding: p-5 for text-heavy panels, p-4 for stat grids",
    "Never use p-8 or p-10 inside panels — that creates SaaS-empty-state feel",
    "Sidebar width: 228px fixed — do not change",
    "Topbar height: 64px fixed — do not change",
    "Mobile: all grids collapse to 1-col at <640px (sm: breakpoint)",
    "Stat grids: 2-col mobile → 4-col desktop (grid-cols-2 sm:grid-cols-4)",
  ],
} as const;

// ─── Border radius system ─────────────────────────────────────────────────────

export const RADII = {
  panel:   "12px",   // VCPanel, SectionCard — rounded-xl in Tailwind
  card:    "12px",   // stat cards, hover cards
  input:   "8px",    // form inputs, filter pills — rounded-lg
  button:  "8px",    // buttons — rounded-lg
  badge:   "9999px", // status badges, chips — rounded-full
  icon:    "10px",   // icon rings — rounded-[10px]
  modal:   "12px",   // modals and dropdowns
  tag:     "4px",    // micro tags inside tables — rounded
} as const;
