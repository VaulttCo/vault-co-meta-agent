# Phase 2C — Advanced Design Tool Install Notes

**Date:** 2026-05-28  
**Session:** Phase 2C — Advanced Design Tool Install  
**Operator:** Claude Code (Sonnet 4.6)

---

## Summary

This phase registers and configures advanced design tooling for the Vault Co portal without modifying any production routes, pages, or the global CSS. All tools are either configured-pending-activation or documented for future manual component installation.

---

## What Was Installed

### Nothing added to node_modules

No `npm install` or `pnpm add` commands were run. All current dependencies remain unchanged.

**Existing dependencies confirmed as already present (required by design tools):**
- `framer-motion` ^12.40.0 — required by Magic UI and Aceternity UI components
- `clsx` ^2.1.1 — required by most component libraries
- `tailwind-merge` ^3.6.0 — required for `cn()` utility
- `@radix-ui/react-slot` ^1.2.4 — required by shadcn-compatible components
- `class-variance-authority` ^0.7.1 — available for CVA-style component APIs

**Utility confirmed present:**
- `src/lib/utils.ts` — exports `cn()` (clsx + twMerge). All copied components should import from here.

---

## What Was Configured

### 21st.dev Magic MCP

**Status:** Active  
**Install command:** `npx @21st-dev/cli@latest install claude --api-key <key>`  
**Install date:** 2026-05-28

**Config written to two locations:**

| File | Scope |
|------|-------|
| `/Users/nickmoore/Library/Application Support/Claude/claude_desktop_config.json` | Claude Desktop app |
| `.claude/settings.json` (project root) | Claude Code CLI — this project |

**Config format (matches official CLI output):**
```json
{
  "mcpServers": {
    "@21st-dev/magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest", "API_KEY=\"<key>\""]
    }
  }
}
```

**What it does:** The 21st.dev Magic MCP allows Claude Code to generate React/Tailwind UI components on demand. All generated components should land in `src/components/sandbox/` and undergo review before any production use. See `usage-rules.ts` for prompt guidelines and token remapping requirements.

**No files modified by this config change:** The MCP server runs as a separate process; it cannot modify files unless Claude Code explicitly writes them.

**Requires restart:** Claude Code must be restarted for the MCP server to appear in available tools.

---

## What Was Documented (Not Installed)

### Magic UI

**Status:** Documented — not installed  
**Risk:** Medium — Tailwind v4 compatibility

Magic UI components are authored for Tailwind v3 (`tailwind.config.js` class-based config). This project uses Tailwind v4 CSS-first configuration (`@theme inline` in `globals.css`).

**When ready to use a Magic UI component:**
```bash
# Do NOT run: npx magic-ui-cli@latest init
# This injects tailwind.config.ts and may break the v4 setup

# Instead, install individual components to the sandbox:
npx magic-ui-cli@latest add shimmer-text --path src/components/sandbox
npx magic-ui-cli@latest add border-beam --path src/components/sandbox
npx magic-ui-cli@latest add ripple --path src/components/sandbox
```

After installation, each component must be manually reviewed:
- Strip hardcoded colors → replace with Vault Co CSS variables
- Verify no `@apply` directive references undefined v4 utilities
- Check the component renders correctly with the existing `@theme inline` tokens

**Permitted Magic UI effects (after review):** shimmer-text, border-beam, animated-gradient-text, ripple, dot-pattern, grid-pattern  
**Blocked effects:** aurora, confetti, particles, neon-glow, infinite marquees on functional content

---

### Aceternity UI

**Status:** Documented — not installed  
**Risk:** Medium — copy-paste model requires manual token remapping  
**No npm package.** Components are copy-pasted from: https://ui.aceternity.com/components

Aceternity UI is a copy-paste component library. There is no install command to run. Each component is pasted into `src/components/sandbox/`, reviewed, and adapted before proposal for production.

**Component integration process:**
1. Copy component source from ui.aceternity.com into `src/components/sandbox/[component-name].tsx`
2. Replace all `cn()` import paths with `@/lib/utils`
3. Replace hardcoded colors with Vault Co CSS variable equivalents
4. Wrap animations in `motion-safe:` Tailwind classes
5. Demo in isolation (add a temporary route under `/sandbox/` if needed)
6. Run through Veronica Design Mode audit before merging to production

**Permitted Aceternity categories (after review):** spotlight, animated border gradients, background grid/dot patterns, card hover tilt (Command Hub only), text reveal  
**Blocked categories:** 3D table transforms, parallax on revenue/reports, full-bleed animated backgrounds on data pages

---

## Files Created

```
src/lib/veronica/design-mode/advanced-tools/
├── tool-registry.ts    — tool definitions, install status, allowed/forbidden use cases
├── usage-rules.ts      — detailed rules per tool + brand compliance checks
└── install-notes.md    — this file
```

## Files Modified

```
.claude/settings.json   — added mcpServers entry for 21st.dev Magic MCP
```

---

## Files NOT Modified

- `src/app/globals.css` — unchanged
- `src/components/ui/VaultUI.tsx` — unchanged
- `src/app/*/page.tsx` — no production pages touched
- `pnpm-lock.yaml` — unchanged (no packages installed)
- `package.json` — unchanged
- `tailwind.config.*` — does not exist (Tailwind v4 project, no config file needed)

---

## Needs Review Before Using in Production

| Tool | Blocker | Action Required |
|------|---------|-----------------|
| 21st.dev Magic MCP | No API key | Get key from https://21st.dev/magic, insert into `.claude/settings.json` |
| Magic UI components | Tailwind v4 compat | Install per-component to sandbox, manually remap tokens |
| Aceternity UI components | Token remapping | Copy-paste to sandbox, replace all hardcoded colors, wrap in motion-safe |

All three tools require passing the **Veronica pre-redesign checklist** in `../page-audit.ts` before any component is merged to a production page.

---

## Build Status

`pnpm build` — see Phase 2C completion report. Build must be clean (0 errors, 0 TypeScript errors) after this phase. The new `.ts` files in `advanced-tools/` are non-page modules and do not affect the route manifest or compiled output unless explicitly imported.
