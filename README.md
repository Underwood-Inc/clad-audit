# @underwoodinc/clad-audit

Standalone, **repository-agnostic** [CLAD](https://github.com/Underwood-Inc/clad-audit) auditor. Node.js CLI — **PowerShell, Linux, macOS**.

**Repository:** https://github.com/Underwood-Inc/clad-audit  
**npm:** https://www.npmjs.com/package/@underwoodinc/clad-audit

## Install

```bash
npm install -g @underwoodinc/clad-audit
clad-audit audit --root /path/to/your/repo
```

```bash
npx @underwoodinc/clad-audit audit --root .
npm install github:Underwood-Inc/clad-audit
```

## Quick start

```bash
clad-audit audit --root . --depth standard
clad-audit audit --root . --depth exhaustive --verbose --report clad-report.md
clad-audit wizard
clad-audit rules      # list rule ids + default advice
clad-audit presets    # list audit tier presets
```

No config file required — generic CLAD defaults apply. Add `.clad-audit.yaml` at your repo root when you need import aliases, extra view paths, or project-specific allowlists.

---

## Copy-paste configs

Save any block below as **`.clad-audit.yaml`** in the repository you audit (`--root`). Values **deep-merge** over generic defaults; omit keys you do not need.

<details>
<summary><strong>1. Zero config</strong> — standard CLAD <code>src/</code> layout</summary>

No file needed. Run from your repo root:

```bash
clad-audit audit --root .
clad-audit audit --root . --preset structure
clad-audit audit --root . --preset full --verbose
```

Expects tiers under `src/`: `atoms/`, `molecules/`, `organisms/`, `recipes/`, `views/`, `apps/`, `sockets/`, `plugs/`.

</details>

<details>
<summary><strong>2. Minimal</strong> — path aliases only</summary>

Use when your bundler resolves `$molecules/` etc. but folder layout matches generic CLAD.

```yaml
# .clad-audit.yaml
srcRoot: src

importAliases:
  $atoms/: atoms
  $molecules/: molecules
  $organisms/: organisms
  $recipes/: recipes
  $views/: views
  $apps/: apps
  $sockets/: sockets
  $plugs/: plugs

analysis:
  defaultDepth: standard
```

```bash
clad-audit audit --root .
```

</details>

<details>
<summary><strong>3. Svelte app</strong> — aliases + prop limit + standard depth</summary>

Typical SvelteKit / Vite CLAD repo with runes and `.svelte` views.

```yaml
# .clad-audit.yaml
srcRoot: src

importAliases:
  $atoms/: atoms
  $molecules/: molecules
  $organisms/: organisms
  $recipes/: recipes
  $views/: views
  $apps/: apps
  $sockets/: sockets
  $plugs/: plugs

analysis:
  defaultDepth: standard
  useTsMorph: true

svelteProps:
  enabled: true
  maxProps: 4
  severity: warning

ignoreGlobs:
  - '**/node_modules/**'
  - '**/dist/**'
  - '**/.svelte-kit/**'
  - '**/coverage/**'
```

```bash
clad-audit audit --root . --preset full
clad-audit audit --root . --preset apps --verbose
```

</details>

<details>
<summary><strong>4. React / Vue (TSX)</strong> — markup extensions + extra view folder</summary>

When UI components live outside `src/views/` (e.g. `src/ui/components/`).

```yaml
# .clad-audit.yaml
srcRoot: src

importAliases:
  '@atoms/': atoms
  '@molecules/': molecules
  '@organisms/': organisms
  '@recipes/': recipes
  '@views/': views
  '@apps/': apps

views:
  extensions: ['.tsx', '.jsx', '.vue']
  extraViewPaths:
    - ui/components

analysis:
  defaultDepth: standard

ignoreGlobs:
  - '**/node_modules/**'
  - '**/dist/**'
  - '**/build/**'
```

```bash
clad-audit audit --root . --preset structure
```

</details>

<details>
<summary><strong>5. Migration / strict pass</strong> — quality signals + tighter limits</summary>

For refactors: enable file-size warnings, Svelte props, and run exhaustive graph rules in CI.

```yaml
# .clad-audit.yaml
srcRoot: src

importAliases:
  $molecules/: molecules
  $organisms/: organisms
  $recipes/: recipes
  $views/: views
  $apps/: apps

analysis:
  defaultDepth: exhaustive
  useTsMorph: true
  couplingHotspotThreshold: 10

svelteProps:
  enabled: true
  maxProps: 4

fileSize:
  apps:
    maxLines: 350
    severity: warning
  molecules:
    maxLines: 800
    severity: warning
  recipes:
    maxLines: 600
    severity: warning

canonAllowlist:
  enabled: true
```

```bash
clad-audit audit --root . --preset exhaustive --report clad-report.md --verbose
```

</details>

<details>
<summary><strong>6. Custom tier folder names</strong> — non-standard paths</summary>

When your repo uses different directory names but the same CLAD semantics.

```yaml
# .clad-audit.yaml
srcRoot: lib

tiers:
  atoms: core/atoms
  molecules: core/molecules
  organisms: core/organisms
  recipes: core/recipes
  views: ui/views
  apps: ui/apps
  sockets: ports
  plugs: adapters

scanGlobs:
  - '**/*.{ts,tsx,svelte}'

ignoreGlobs:
  - '**/node_modules/**'
  - '**/dist/**'
```

```bash
clad-audit audit --root .
```

</details>

<details>
<summary><strong>7. Extra composition-root allowlist</strong> — project-specific <code>apps/</code> files</summary>

Add basenames that are genuinely composition roots but not in generic defaults.

```yaml
# .clad-audit.yaml
srcRoot: src

apps:
  allowedFilenamePatterns:
    - '^mount[A-Za-z0-9_-]*\\.ts$'
    - '^wire[A-Za-z0-9_-]*\\.ts$'
    - 'AppSession\\.svelte\\.ts$'
    - '^bootstrap[A-Za-z0-9_-]*\\.ts$'
    # project-specific composition roots:
    - '^createMyAppShell\\.ts$'
    - '^runInitialBoot\\.ts$'

views:
  extraViewPaths:
    - ui/components
```

```bash
clad-audit audit --root . --preset apps --verbose
```

</details>

<details>
<summary><strong>8. <code>package.json</code> scripts</strong> — npm / pnpm / yarn</summary>

```json
{
  "scripts": {
    "clad:audit": "clad-audit audit --root . --preset structure",
    "clad:full": "clad-audit audit --root . --preset full --verbose",
    "clad:report": "clad-audit audit --root . --preset exhaustive --report clad-report.md",
    "clad:wizard": "clad-audit wizard"
  },
  "devDependencies": {
    "@underwoodinc/clad-audit": "^0.3.0"
  }
}
```

Local install (no global):

```bash
npm install -D @underwoodinc/clad-audit
npx clad-audit audit --root .
pnpm clad:audit
```

</details>

<details>
<summary><strong>9. GitHub Actions CI</strong> — fail on structure errors</summary>

```yaml
# .github/workflows/clad-audit.yml
name: CLAD audit

on:
  pull_request:
  push:
    branches: [master, main]

jobs:
  clad-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - run: npm ci

      - name: Structure audit (errors only)
        run: npx clad-audit audit --root . --preset structure --depth standard

      - name: Full report artifact (optional)
        if: always()
        run: npx clad-audit audit --root . --preset full --report clad-report.md

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: clad-report
          path: clad-report.md
```

Pin `@underwoodinc/clad-audit` in `devDependencies` for reproducible CI.

</details>

Full annotated example: [`examples/clad-audit.example.yaml`](./examples/clad-audit.example.yaml).

---

## What to expect

The tool scans **your** tree (not this repo). It never imports your app code. Each finding includes **reasoning**, **advice**, and optional **remediation steps** (deterministic, no LLM).

| Output | Flag / command |
|--------|----------------|
| Colorized terminal | default in TTY; `--no-color` / `NO_COLOR=1` |
| JSON | `--json` |
| Markdown report | `--report path.md` |
| Verbose remediation | `--verbose` |

<details>
<summary><strong>Rule index</strong> — all 16 rules by category</summary>

| Category | Rule ids | Default severity | Min depth |
|----------|----------|------------------|-----------|
| Apps composition root | `app-tier-allowlist`, `view-in-app-tier`, `organism-in-app-tier`, `recipe-in-app-tier` | error | quick |
| Import boundaries | `import-boundary`, `import-dynamic-boundary`, `import-reexport-boundary` | error | quick / standard / deep |
| Tier impurity | `tier-impurity` | error | quick |
| Placement & shape | `misplaced-tier-shape`, `unknown-tier-file` | error / warning | standard |
| Canon policy | `canon-parallel-allowlist` | warning | quick |
| Svelte (optional) | `svelte-props-excess` | warning | quick (off by default) |
| Quality signals | `file-size-tier`, `barrel-reexport-smell`, `import-cycle`, `tier-coupling-hotspot` | warning / info | quick / deep / exhaustive |

Expand each category below for detection details and remediation patterns.

</details>

<details>
<summary><strong>Analysis depth</strong> — which rules run</summary>

Depth gates rules by `minDepth`. Presets pick rule subsets; `--depth` gates how deep analysis runs.

| Depth | Analysis | Rules unlocked |
|-------|----------|----------------|
| `quick` | Static imports, path tiers | Core 9 rules (see below) |
| `standard` | + comment-aware impurity, import graph (regex), misplaced shape | + `unknown-tier-file`, `misplaced-tier-shape`, `import-dynamic-boundary` |
| `deep` | + ts-morph TypeScript graph | + `import-reexport-boundary`, `barrel-reexport-smell` |
| `exhaustive` | + cycle + fan-in analysis | + `import-cycle`, `tier-coupling-hotspot` |

```bash
clad-audit audit --root . --depth exhaustive
clad-audit audit --root . --preset structure   # apps + import rules only
```

</details>

<details>
<summary><strong>Audit presets</strong> — rule bundles</summary>

| Preset | Runs |
|--------|------|
| `apps` | Apps-tier hygiene (4 rules) |
| `imports` | `import-boundary`, `tier-impurity` |
| `structure` | Apps + imports (6 rules) |
| `quality` | Canon, file size, Svelte props |
| `standard` | Structure (errors only) |
| `full` | All rules at `standard` depth default |
| `exhaustive` | All rules at `exhaustive` depth |

</details>

<details>
<summary><strong>Apps tier (composition root)</strong> — errors · depth <code>quick</code></summary>

Files in `apps/` should be thin composition roots only.

| Rule id | Detects | Default severity |
|---------|---------|------------------|
| `app-tier-allowlist` | `.ts` files whose basename is not mount*, wire*, *AppSession, *Bridge, bootstrap*, etc. | error |
| `view-in-app-tier` | View extensions (`.svelte`, `.tsx`, `.jsx`, `.vue`) in `apps/` | error |
| `organism-in-app-tier` | `*Rune.svelte.ts`, `*Session.svelte.ts` (except allowed AppSession) | error |
| `recipe-in-app-tier` | `register*`, `*Paint.ts`, orchestrator-shaped files | error |

**Remediation pattern:** move to `views/`, `organisms/`, or `recipes/`; wire from mount* / *AppSession.

</details>

<details>
<summary><strong>Import boundaries</strong> — errors · depth <code>quick</code> + extensions</summary>

Enforces **inward** CLAD dependency flow (outer tiers may depend on inner tiers, not vice versa). Matrix is configurable in `.clad-audit.yaml → importBoundary`.

| Rule id | Detects | Min depth |
|---------|---------|-----------|
| `import-boundary` | Static `import … from` crossing forbidden tier pairs | quick |
| `import-dynamic-boundary` | `import()` and `require()` crossing boundaries | standard |
| `import-reexport-boundary` | `export … from` exposing forbidden tiers | deep |

Supports import aliases (e.g. `$molecules/`) when configured in the **consumer** repo.

</details>

<details>
<summary><strong>Tier impurity (framework leakage)</strong> — errors · depth <code>quick</code></summary>

Inner tiers stay testable and framework-agnostic. **Generic defaults** flag:

| Tier | Banned patterns (configurable) |
|------|--------------------------------|
| `molecules` | Svelte/React/Vue imports; `$state`, `$derived`, `from 'svelte'` |
| `sockets` | Direct `/plugs/` path imports |

At **standard+** depth, matches ignore comments and string literals.

**Remediation:** extract runes to `organisms/`; adapters to `plugs/` behind `sockets/` contracts.

</details>

<details>
<summary><strong>Framework-specific rules</strong> — Svelte, React, Vue, TSX</summary>

clad-audit is **framework-aware** but not framework-mandatory. Generic defaults encode common CLAD shapes; consumers override in `.clad-audit.yaml`.

### View markup (all UI frameworks)

| Rule | Framework signal | Detects |
|------|------------------|---------|
| `view-in-app-tier` | `.svelte`, `.tsx`, `.jsx`, `.vue` | Markup files in `apps/` |
| `misplaced-tier-shape` | same extensions + `extraViewPaths` | View-shaped files outside `views/` |

### Svelte runes & sessions

| Rule | Pattern | Detects |
|------|---------|---------|
| `organism-in-app-tier` | `*Rune.svelte.ts`, `*Session.svelte.ts` | Reactive modules in `apps/` (except `*AppSession`) |
| `tier-impurity` | `$state`, `$derived`, `from 'svelte'` | Runes / Svelte imports in `molecules/` |
| `svelte-props-excess` | `$props()` destructuring count | Components with too many props (**off by default**) |

### React / Vue impurity (molecules tier)

| Banned import substrings (default) | Purpose |
|-------------------------------------|---------|
| `react`, `react-dom` | Keep molecules free of UI framework hooks |
| `vue`, `@vue/` | Same for Vue SFC/composables |
| `/svelte`, `svelte/` | Same for Svelte |

### Import graph (deep+)

| Capability | Framework note |
|------------|----------------|
| `parseSvelteImports` | Reads `<script>` blocks in `.svelte` for boundary analysis |
| ts-morph graph | Parses `.ts`, `.tsx` for static/dynamic/re-export edges |

**Remediation pattern:** markup → `views/`; runes/sessions → `organisms/`; orchestrators → `recipes/`; pure logic → `molecules/`.

</details>

<details>
<summary><strong>Consumer configuration (NFR-001)</strong> — agnostic defaults + YAML merge</summary>

Shipped defaults match **generic CLAD layout only** — no product filenames, no import aliases.

| Config area | What you override in `.clad-audit.yaml` |
|-------------|----------------------------------------|
| `tiers` | Folder names if your repo uses different paths |
| `importAliases` | `$molecules/`, `@app/` etc. for boundary resolution |
| `apps.allowedFilenamePatterns` | Extra composition-root basenames |
| `views.extraViewPaths` | Non-standard view folders (e.g. `ui/components/`) |
| `importBoundary` | Tier → allowed downstream tiers matrix |
| `tierImpurity` | Per-tier banned imports and content regexes |
| `svelteProps` | Enable `svelte-props-excess` + `maxProps` |
| `ignoreGlobs` / `scanGlobs` | What files enter the audit |

Deep-merge at audit time: unset keys keep generic defaults.

</details>

<details>
<summary><strong>CLI & reporting (NFR-002)</strong> — cross-platform Node.js</summary>

| Command | Purpose |
|---------|---------|
| `clad-audit audit` | Run rules against `--root` |
| `clad-audit wizard` | Interactive depth/preset/config walkthrough |
| `clad-audit rules` | List built-in rule ids + default advice |
| `clad-audit presets` | List named rule bundles |

| Flag | Purpose |
|------|---------|
| `--depth quick\|standard\|deep\|exhaustive` | Gate rules by analysis depth |
| `--preset <name>` | Subset of rules (see presets table) |
| `--json` | Machine-readable findings |
| `--report <path>` | Markdown report file |
| `--verbose` | Print remediation steps per finding |
| `--no-color` | Plain text (also `NO_COLOR=1`) |

Works in PowerShell, bash, and zsh — no shell scripts required.

</details>

<details>
<summary><strong>Placement & shape</strong> — errors/warnings · depth <code>standard</code></summary>

| Rule id | Detects | Severity |
|---------|---------|----------|
| `misplaced-tier-shape` | View/organism/recipe **filename shape** in wrong tier folder (anywhere under `src/`) | error |
| `unknown-tier-file` | File under `src/` not matching any configured tier path | warning |

Complements apps-tier rules: catches misfiled modules outside `apps/` too.

</details>

<details>
<summary><strong>Canon & policy molecules</strong> — warnings · depth <code>quick</code></summary>

| Rule id | Detects |
|---------|---------|
| `canon-parallel-allowlist` | `*_ALLOWLIST` constants in molecules **outside** `*Catalog.ts` modules |

Encourages one table-driven Canon Catalog per policy domain.

</details>

<details>
<summary><strong>Structural quality signals</strong> — warnings/info · migration hints</summary>

These inform refactors; they do not define CLAD tier law by themselves.

| Rule id | Detects | Min depth | Severity |
|---------|---------|-----------|----------|
| `file-size-tier` | Lines over tier limit (apps/molecules/recipes) | quick | warning |
| `import-cycle` | Circular import paths | exhaustive | warning |
| `barrel-reexport-smell` | `index.ts` re-exporting multiple tiers | deep | info |
| `tier-coupling-hotspot` | Modules imported by many others | exhaustive | info |

</details>

<details>
<summary><strong>Requirements registry</strong> — what we trace in <em>this</em> repo</summary>

This package is a **library tool**. Requirements describe what **clad-audit** must do for its consumers — not CLAD law for your application.

We group by **kind** so trace IDs are not one-per-test fiction:

| ID | Kind | What it covers | Test coverage |
|----|------|----------------|---------------|
| FR-001 | Functional | Apps-tier placement (4 rules) | rules + engine fixture |
| FR-002 | Functional | Import boundaries + path resolution | pathTier, importAnalysis, rules |
| FR-003 | Functional | Tier impurity patterns | rules |
| FR-004 | Functional | Misplaced shape / unknown tier | rules |
| FR-005 | Functional | Canon allowlist drift | rules |
| FR-006 | Functional | Svelte props when consumer enables | rules |
| FR-007 | Functional | File size, cycles, barrels, hotspots | rules (partial — graph rules at exhaustive depth) |
| NFR-001 | Non-functional | Agnostic defaults + YAML merge | defaultConfig, loadConfig |
| NFR-002 | Non-functional | CLI, presets, colorized/JSON/markdown output | terminalStyle, printAuditReport, auditPresets |
| META-001 | Meta | requirements-tracer on this Vitest suite | traceability.test |

**Not requirements:** individual rule ids, preset names, or Mappy-specific filenames — those are implementation/config details documented above.

Full definitions: [`requirements-registry.yaml`](./requirements-registry.yaml). Tests prefix descriptions with `[FR-xxx]`, `[NFR-xxx]`, or `[META-001]`.

</details>

---

## Develop

Node.js **22+**.

```bash
git clone https://github.com/Underwood-Inc/clad-audit.git
cd clad-audit
npm install
npm run verify    # vitest + requirements-tracer audit
npm run build
```

```bash
npm run trace:audit
npm run trace:report   # → traceability-report/index.html
```

CI: unit tests + trace audit + [requirements-tracer-action](https://github.com/Underwood-Inc/requirements-tracer-action) on PRs.

## Publish

```bash
npm run build
npm publish --access public
```

## License

MIT — [LICENSE](./LICENSE).
