# Social posts — CLAD Audit launch

**@underwoodinc/clad-audit** npm **0.5.2** · **CLAD Audit** VS Code / Cursor extension  
**Links:** [npm](https://www.npmjs.com/package/@underwoodinc/clad-audit) · [Marketplace](https://marketplace.visualstudio.com/items?itemName=underwoodinc.clad-audit-vscode) · [GitHub](https://github.com/Underwood-Inc/clad-audit)

---

## SEO reference

**Primary keywords:** CLAD audit, Composable Layered Agnostic Design, architecture lint, tier boundaries, import boundary analysis, static code analysis, TypeScript architecture, Svelte/React/Vue linting, VS Code extension, Cursor IDE, npm devtools, monorepo structure, software architecture tooling, deterministic remediation

**Meta description (≤160 chars):**  
CLAD Audit — npm CLI + VS Code/Cursor extension for tier boundaries, import rules, and architecture lint. Free, MIT, framework-aware.

**Suggested post title (LinkedIn article / link preview):**  
CLAD Audit: architecture lint for tiered codebases — npm CLI and VS Code / Cursor extension

**Alt text (extension icon / hero image):**  
CLAD Audit logo — inline architecture diagnostics for VS Code and Cursor

**Canonical URLs (use in every post):**
- https://www.npmjs.com/package/@underwoodinc/clad-audit
- https://marketplace.visualstudio.com/items?itemName=underwoodinc.clad-audit-vscode
- https://github.com/Underwood-Inc/clad-audit

---

## LinkedIn

**CLAD Audit is live** — catch architecture drift before it becomes a refactor.

**CLAD** (Composable Layered Agnostic Design) is a tiered way to organize UI and server code: Atoms → Molecules → Organisms → Recipes → Views → Apps, with explicit import boundaries. **CLAD Audit** turns that structure into **actionable lint** — in the terminal, in CI, and inline in your editor.

Two ways to run the same engine:

✦ **@underwoodinc/clad-audit** (npm) — Node.js CLI for PowerShell, Linux, and macOS. **16 rules**: import boundaries, tier impurity, apps composition-root hygiene, misplaced shapes, Canon Catalog drift, Svelte prop limits, cycles, and coupling hotspots. Depth presets from `quick` to `exhaustive`. Markdown/JSON reports. Deterministic remediation steps — **no LLM**.

✦ **CLAD Audit extension** (VS Code + Cursor) — full auditor bundled in-process. Problems panel + inline squiggles like ESLint. **Initialize Config** drafts `.clad-audit.yaml` from your stack (Svelte / React / Vue / generic). Findings Explorer, filter query language, quick fixes, monorepo root discovery.

Works **without config** on standard `src/` CLAD layouts. Add `.clad-audit.yaml` when you need aliases, custom tier paths, or allowlists.

Free · MIT · framework-aware (Svelte, React, Vue, TypeScript)

**npm:** https://www.npmjs.com/package/@underwoodinc/clad-audit  
**VS Code / Cursor:** https://marketplace.visualstudio.com/items?itemName=underwoodinc.clad-audit-vscode  
**Repo:** https://github.com/Underwood-Inc/clad-audit

#CLAD #SoftwareArchitecture #StaticAnalysis #TypeScript #Svelte #React #Vue #VSCode #Cursor #DevTools #OpenSource #CodeQuality #FrontendArchitecture #CleanArchitecture #Linting #npm #SoftwareEngineering

---

## Facebook

**CLAD Audit** — architecture lint that shows up where you code.

Tired of “this import feels wrong” turning into a week-long refactor? CLAD Audit checks **tier boundaries**, **composition-root hygiene**, and **framework leakage** across Svelte, React, Vue, and TypeScript — with clear advice on where files belong.

**Two installs, one engine:**

📦 **npm package** `@underwoodinc/clad-audit` — run in terminal or CI  
`npx @underwoodinc/clad-audit audit --root .`

🧩 **VS Code / Cursor extension** — inline squiggles + Problems panel  
Search **CLAD Audit** on the Marketplace (publisher: underwood inc)

**Highlights:**
- 16 architecture rules — import boundaries, tier impurity, apps-tier allowlists, Canon Catalog drift, cycles
- Zero config on standard CLAD `src/` layouts; optional `.clad-audit.yaml` for aliases and monorepos
- **Initialize Config** in the editor — detects your stack and drafts YAML (you confirm before write)
- Markdown + JSON reports for PRs and CI
- Free · MIT · no LLM — deterministic remediation only

**Get it:**
npm → https://www.npmjs.com/package/@underwoodinc/clad-audit  
Extension → https://marketplace.visualstudio.com/items?itemName=underwoodinc.clad-audit-vscode

#CLAD #SoftwareArchitecture #TypeScript #Svelte #VSCode #Cursor #DevTools #CodeQuality #OpenSource #WebDev #FrontendDev

---

## Discord / Community

**CLAD Audit is out** — npm CLI **@underwoodinc/clad-audit** + **VS Code / Cursor** extension. Architecture lint for tiered codebases: import boundaries, composition roots, framework impurity — with ESLint-style inline diagnostics.

**What is CLAD?** Composable Layered Agnostic Design — small named tiers (atoms → molecules → organisms → recipes → views → apps) wired through explicit boundaries. CLAD Audit enforces that structure in **your** repo without importing your app code.

**npm CLI** (`@underwoodinc/clad-audit` **0.5.2**)
- `clad-audit audit --root .` — no config required on generic `src/` layouts
- **16 rules** — `import-boundary`, `tier-impurity`, apps-tier allowlist, misplaced shapes, `canon-parallel-allowlist`, Svelte props, import cycles, coupling hotspots
- Depth: `quick` · `standard` · `deep` · `exhaustive` — presets: `structure`, `full`, `exhaustive`
- Output: color terminal · `--json` · `--report clad-report.md` · `--verbose` remediation
- `clad-audit wizard` for interactive setup
- CI-friendly — GitHub Actions example in README

**VS Code / Cursor extension** (`underwoodinc.clad-audit-vscode`)
- Bundled engine — **no separate CLI install** for editor use
- Problems panel + precise squiggles (imports, `$props()`, impurity tokens)
- **CLAD: Initialize Config** — detects Svelte/React/Vue, maps tsconfig aliases, drafts `.clad-audit.yaml` (confirm before write)
- Activity bar: **Explore** + **Findings** · full-page Findings Explorer · filter query (`rule:`, `tier:`, `file:`, regex)
- Monorepo: discovers multiple `.clad-audit.yaml` roots (e.g. `apps/mappy/`)
- Quick fixes: copy remediation · copy config-exception YAML
- Runs on open + save (debounced); `cladAudit.*` settings

**Links**
- npm: https://www.npmjs.com/package/@underwoodinc/clad-audit
- Marketplace: https://marketplace.visualstudio.com/items?itemName=underwoodinc.clad-audit-vscode
- GitHub: https://github.com/Underwood-Inc/clad-audit

Free · MIT · Svelte · React · Vue · TypeScript

---
