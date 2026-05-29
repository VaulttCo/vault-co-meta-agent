/**
 * Vault Co Advanced Design Tool Registry
 *
 * Single source of truth for all third-party design tools considered or
 * installed for this project. Update installStatus when a tool is activated.
 *
 * Import this in Veronica design-mode audit logic to gate which tools may be
 * used on which page types before production sign-off.
 */

export type RiskLevel = "low" | "medium" | "high";
export type InstallStatus =
  | "active"
  | "configured-pending-key"
  | "documented-not-installed"
  | "audit-only"
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
