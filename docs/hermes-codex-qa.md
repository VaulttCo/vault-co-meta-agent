# Hermes QA + Codex Bridge — Setup

Hermes is Vault Core's **Build Operations & QA Director** — a development/QA layer, **not** a business
executive and **not** part of the runtime workforce. Claude Code builds · **Codex audits** · Hermes
coordinates the QA loop, classifies findings, and logs to Obsidian. **No fix is applied without human
approval. No production runtime behavior is changed by this system.**

Run the loop with the `hermes-qa` Claude Code skill (`/hermes-qa`). Prompts live in
`docs/codex-review-prompts.md`; the playbook is `docs/vault-core-qa-playbook.md`.

---

## 1. Codex CLI — official package only

**Use only the official OpenAI package `@openai/codex`.** Do not install any other package named
"codex". Verified in registry: `@openai/codex` (e.g. v0.136.0, registry.npmjs.org).

```bash
npm install -g @openai/codex
codex --version
codex login        # OpenAI auth (ChatGPT plan or API key)
```

> **This environment:** the global install failed with `EACCES` on `/usr/local/lib/node_modules`
> (no root). That's a permissions issue, not a package issue. Fix it one of these ways, then re-run:
> - `sudo npm install -g @openai/codex`, **or**
> - use a user-writable global prefix:
>   ```bash
>   npm config set prefix ~/.npm-global
>   export PATH="$HOME/.npm-global/bin:$PATH"   # add to ~/.zshrc
>   npm install -g @openai/codex
>   ```
> Until Codex is installed, Hermes uses the **manual fallback** (below) — the phase is not blocked.

### Read-only usage (how Hermes calls it)
```bash
# Review the working-tree diff, read-only (no edits):
codex exec --sandbox read-only "Review this diff for the Vault Core risks in docs/codex-review-prompts.md"
# Or scope to a path / paste a specific prompt from docs/codex-review-prompts.md.
```
Codex must default to **read-only**; it edits files only if a human explicitly approves.

---

## 2. Claude Code Codex plugin (optional convenience)

Official bridge: **`codex-plugin-cc`** (OpenAI). If your Claude Code build supports plugins:

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

> **This environment:** Claude Code's plugin system is present (`~/.claude/plugins`, marketplace
> `claude-plugins-official`), but the Codex marketplace is not added and plugin install is a
> user-invoked action. If the plugin can't be added here, use the CLI or the manual fallback. **Do
> not block the phase on plugin availability.**

---

## 3. Manual fallback (works with zero tooling)

If neither the Codex CLI nor the plugin is available, Hermes still runs the loop:

1. Hermes runs the deterministic scan + build + lint:
   ```bash
   node scripts/hermes-qa.mjs
   pnpm build
   pnpm lint
   ```
2. Hermes prints the **Codex QA brief** (what changed + the audit prompt from
   `docs/codex-review-prompts.md`) and asks **you** to run Codex in your own terminal:
   ```bash
   codex exec --sandbox read-only "<paste the Vault Core audit prompt>"
   ```
3. You paste Codex's findings back into the chat.
4. Hermes summarizes, classifies P0–P3, proposes fixes (human-approved), and writes the Obsidian
   session note.

This keeps the QA loop fully functional even where Codex can't be installed.

---

## 4. Safety
Hermes and Codex never expose/print/commit secrets, never add auto-send / GHL / Stripe mutation,
never bypass approvals, never weaken role guards, never remove mock fallback, never modify production
data. See `docs/vault-core-security-checklist.md`.
