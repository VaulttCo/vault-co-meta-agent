/**
 * Vault Co Advanced Design Tool Registry
 *
 * Single source of truth for all third-party design tools considered or
 * installed for this project. Update installStatus when a tool is activated.
 *
 * Import this in Veronica design-mode audit logic to gate which tools may be
 * used on which page types before production sign-off.
 */

export type RiskLevel = "low" | "medium" | "medium-high" | "high";
export type InstallStatus =
  | "active"
  | "configured-pending-key"
  | "documented-not-installed"
  | "audit-only"
  | "inspiration-only"
  | "reference-only"
  | "blocked";

export interface DesignTool {
  name: string;
  slug: string;
  purpose: string;
  allowedUseCases: readonly string[];
  forbiddenUseCases: readonly string[];
  installStatus: InstallStatus;
  riskLevel: RiskLevel;
  approvalNeededBeforeProduction: boolean;
  notes: string;
}

export const TOOL_REGISTRY = [
  {
    name: "21st.dev Magic MCP",
    slug: "21st-dev-magic",
    purpose:
      "Claude Code MCP server that generates production-ready React/Tailwind UI components on demand. Components are rendered into isolated files — no automatic page injection.",
    allowedUseCases: [
      "Generating isolated component candidates for Veronica Design Mode v2 review",
      "Scaffolding new VaultUI primitives before manual integration",
      "Rapid prototyping in src/components/sandbox/ only",
      "Generating Magic UI / shadcn-compatible component skeletons",
    ],
    forbiddenUseCases: [
      "Auto-injecting components directly into existing production pages",
      "Overwriting any file in src/components/ui/ without manual review",
      "Generating components that import conflicting CSS variables",
      "Bypassing the Veronica pre-redesign checklist",
    ],
    installStatus: "active" as InstallStatus,
    riskLevel: "low" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "Installed via npx @21st-dev/cli@latest install claude on 2026-05-28. Config written to /Library/Application Support/Claude/claude_desktop_config.json (Desktop) and .claude/settings.json (Claude Code project). No npm package installed in node_modules.",
  },
  {
    name: "Magic UI",
    slug: "magic-ui",
    purpose:
      "Pre-built animated React component library. Components use Tailwind + Framer Motion. Includes effects like shimmer text, animated beam, border beam, ripple, and more.",
    allowedUseCases: [
      "Individual component installation via CLI into src/components/sandbox/",
      "Adapting shimmer, beam, or glow effects to Vault Co tokens after manual review",
      "Inspiration source for Veronica Design Mode v2 proposals",
      "Hero section / Veronica console visual enhancements after production approval",
    ],
    forbiddenUseCases: [
      "Running broad install (npx magic-ui init) — injects Tailwind v3 config",
      "Applying animation effects to revenue, client, or reporting data tables",
      "Using default Magic UI color palette — must be remapped to Vault Co tokens",
      "Installing without reviewing Tailwind v4 compatibility of each component",
    ],
    installStatus: "documented-not-installed" as InstallStatus,
    riskLevel: "medium" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "CLI: npx magic-ui-cli@latest add [component]. RISK: Magic UI components assume Tailwind v3 config format. This project uses Tailwind v4 CSS-first config. Each component must be manually reviewed and adapted before use. framer-motion is already installed.",
  },
  {
    name: "Aceternity UI",
    slug: "aceternity-ui",
    purpose:
      "Cinematic-grade animated React UI components. Known for spotlight effects, 3D card transforms, background gradients, glowing borders, and parallax scenes.",
    allowedUseCases: [
      "Veronica AI hero panel — spotlight or animated border after approval",
      "Command Hub hero section — background grid or beam effects",
      "Isolated sandbox demos only until production-approved",
      "Reference source for high-quality Framer Motion patterns",
    ],
    forbiddenUseCases: [
      "Running aceternity init or any broad install script",
      "Adding 3D transforms or heavy parallax to data-dense pages (clients, reports, revenue)",
      "Using Aceternity components that hardcode light-mode colors",
      "Installing @aceternity/ui as a package dependency (components are copy-paste only)",
    ],
    installStatus: "documented-not-installed" as InstallStatus,
    riskLevel: "medium" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "Copy-paste model only — no npm package. Components live at ui.aceternity.com. Requires cn() utility (already present at src/lib/utils.ts) and framer-motion (already installed). Tailwind v4 compatibility must be verified per component.",
  },
  {
    name: "Impeccable UI",
    slug: "impeccable-ui",
    purpose:
      "Structured UI audit methodology for scoring components and page sections against Vault Co design standards. Not a package — a defined 8-category scoring workflow implemented in impeccable-audit.ts. Produces a 1–5 weighted score and a Level 1–4 recommendation.",
    allowedUseCases: [
      "Auditing sandbox components before promotion to src/components/ui/",
      "Pre-redesign scoring of production page sections during Phase 3 review",
      "Evaluating third-party component candidates (Magic UI, Aceternity) before integration",
      "Generating structured pass/fail/conditional reports to accompany promotion proposals",
    ],
    forbiddenUseCases: [
      "Auto-applying Level 3 or Level 4 recommendations without explicit user approval",
      "Using a passing audit score as permission to bypass the promotion approval gate",
      "Running broad page redesigns justified only by an audit score — proposals are still required",
      "Treating a Level 1 recommendation as a green light to touch frozen pages",
      "Direct redesign of any production page based on audit findings alone",
    ],
    installStatus: "audit-only" as InstallStatus,
    riskLevel: "medium" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "Audit-only methodology — no npm package, no CLI, no external dependency. All logic lives in src/lib/veronica/design-mode/advanced-tools/impeccable-audit.ts. Level 1–2 recommendations may proceed after standard build check. Level 3–4 require a written proposal and explicit user approval before any code is written. Direct redesign is always forbidden as an audit output.",
  },
  {
    name: "UI/UX Pro Max",
    slug: "ux-pro-max",
    purpose:
      "Structured UX decision framework for Veronica Design Mode. Defines canonical principles for dashboards, CRM/tables, AI consoles, onboarding, empty/loading/error states, mobile usability, conversion, accessibility, decision hierarchy, and friction reduction. Includes a 27-item UX Flow Approval Checklist that must be completed before any UX flow change ships to production.",
    allowedUseCases: [
      "Evaluating UX proposals and redesign requests against documented principles",
      "Running the UX Flow Approval Checklist before promoting a flow to production",
      "Informing Veronica Design Mode proposals with evidence-based UX rationale",
      "Auditing friction, accessibility, and mobile compliance in sandbox components",
    ],
    forbiddenUseCases: [
      "Direct redesign of any production page or flow based on these rules alone",
      "Using a passing checklist score as permission to bypass the standard promotion approval gate",
      "Auto-applying UX changes without a written proposal and explicit user approval",
      "Modifying globals.css, route files, or Supabase schema as a UX fix",
    ],
    installStatus: "audit-only" as InstallStatus,
    riskLevel: "medium" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "Rules-only governance module — no npm package, no CLI, no runtime dependency. All logic lives in src/lib/veronica/design-mode/advanced-tools/ux-pro-max.ts. Principles inform proposals; they do not authorize changes. Any UX flow change requires the UX_FLOW_APPROVAL_CHECKLIST to be completed and recorded before production merge. Direct redesign is always forbidden as an output of applying these rules.",
  },
  {
    name: "Awesome Design MD",
    slug: "awesome-design-md",
    purpose:
      "Brand-level design inspiration framework for Veronica Design Mode. Defines 9 approved inspiration brands (Linear, Stripe, Vercel, Apple, Arc, Notion, NVIDIA, Airbnb, Framer), what abstract design principles may be extracted, what is forbidden to copy, Vault Co translation rules, a 17-item anti-copying checklist, and the mandatory 6-step Inspiration → Vault transformation process. Inspiration only — no direct copying, cloning, or brand-identified visual language permitted.",
    allowedUseCases: [
      "Extracting abstract design principles from approved brands for Vault Co proposal development",
      "Running the anti-copying checklist before promoting an inspiration-derived sandbox component",
      "Mapping brand principles to specific Vault Co pages using the brand-context applicability map",
      "Informing sandbox component design with world-class reference points while maintaining Vault Co identity",
    ],
    forbiddenUseCases: [
      "Copying any logo, wordmark, brand mark, color palette, or proprietary font from any brand",
      "Recreating any layout, card, or view that would be recognized as belonging to a specific product",
      "Using 'inspired by X' as justification to bypass the anti-copying checklist or transformation process",
      "Applying inspiration-derived patterns directly to production pages without completing all 6 transformation steps",
      "Treating inspiration clearance as sufficient — Impeccable UI audit and user approval are still required",
    ],
    installStatus: "inspiration-only" as InstallStatus,
    riskLevel: "medium-high" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "Inspiration-only governance module — no npm package, no CLI, no external dependency. All logic lives in src/lib/veronica/design-mode/advanced-tools/awesome-design-md.ts. The risk level is medium-high because design inspiration is the most common vector for unintentional brand copying. Every inspired element must complete the 6-step transformation process and pass the 17-item anti-copying checklist before a production proposal may be written. Direct copying is always forbidden — the checklist exists to catch unintentional copying, not to authorize it.",
  },
  {
    name: "SkillUI / Clone Reference Tools",
    slug: "clone-reference-tools",
    purpose:
      "Structured governance for using website analysis and cloning tools (SkillUI, screenshot analysis, URL inspection, v0-style generation from reference URLs) as design research — not implementation sources. Defines the 6-step URL analysis workflow, mandatory transformation rules, a 14-item legal/brand safety checklist, and a sandbox-only requirement for any component informed by a clone session.",
    allowedUseCases: [
      "Studying layout patterns, section hierarchy, spacing rhythm, and conversion flow on reference URLs",
      "Extracting abstract design principles from observed sites using the URL analysis workflow",
      "Producing written principle lists and abstract wireframes (no colors, no brand identifiers)",
      "Informing sandbox component proposals after the full transformation and legal safety process is complete",
    ],
    forbiddenUseCases: [
      "Copying any generated HTML, CSS, JSX, or Tailwind output from a clone tool into any Vault Co file",
      "Copying full websites, exact page sections, or exact card/component layouts",
      "Reproducing brand assets, proprietary icons, illustration styles, or photography from any reference site",
      "Using a cloned layout as a scaffold that is 'just cleaned up' — re-implementation from scratch is mandatory",
      "Touching any production file before the approval gate is cleared and written user approval received",
      "Importing or promoting any sandbox component that contains reference-site code, even commented out",
    ],
    installStatus: "reference-only" as InstallStatus,
    riskLevel: "high" as RiskLevel,
    approvalNeededBeforeProduction: true,
    notes:
      "Reference-only governance module — no npm package, no CLI, no external dependency. All rules live in src/lib/veronica/design-mode/advanced-tools/clone-reference-rules.ts. Risk level is HIGH: clone tools are the highest-risk vector in the design toolchain — they can reproduce third-party layouts, copy proprietary visual systems, and introduce legal or brand-safety problems. Every clone reference session requires a written research question before it begins. All outputs are principles, never code. The legal/brand safety checklist must clear before any sandbox component is created. Direct cloning is unconditionally forbidden.",
  },
] as const satisfies readonly DesignTool[];

export type ToolSlug = (typeof TOOL_REGISTRY)[number]["slug"];

export function getToolBySlug(slug: ToolSlug): DesignTool {
  return TOOL_REGISTRY.find((t) => t.slug === slug) as DesignTool;
}

export function getActiveTools(): readonly DesignTool[] {
  return TOOL_REGISTRY.filter((t) => t.installStatus === "active");
}

export function getProductionReadyTools(): readonly DesignTool[] {
  return TOOL_REGISTRY.filter(
    (t) => t.installStatus === "active" && !t.approvalNeededBeforeProduction
  );
}
