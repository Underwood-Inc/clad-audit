# @underwoodinc/clad-audit

Standalone, **repository-agnostic** CLAD auditor. Node.js CLI — runs on **PowerShell, Linux, and macOS**.

**Repository:** https://github.com/Underwood-Inc/clad-audit  
**npm:** https://www.npmjs.com/package/@underwoodinc/clad-audit

## Install

```bash
npm install -g @underwoodinc/clad-audit
clad-audit audit --root /path/to/your/repo
```

Or without global install:

```bash
npx @underwoodinc/clad-audit audit --root .
```

From git:

```bash
npm install github:Underwood-Inc/clad-audit
```

## Quick start

```bash
clad-audit audit --root . --depth standard
clad-audit audit --root . --depth exhaustive --verbose --report clad-report.md
clad-audit wizard
clad-audit rules
clad-audit presets
```

Add an optional `.clad-audit.yaml` in the repo you audit. See [`examples/clad-audit.example.yaml`](./examples/clad-audit.example.yaml).

## What it does

- Scans any codebase for [CLAD](https://github.com/Underwood-Inc/clad-audit) tier placement and import-boundary violations
- **Scripted remediation** — reasoning, advice, and step-by-step fix plans (no LLM)
- Analysis depth from quick regex passes to exhaustive ts-morph import graphs
- Colorized TTY output, JSON, and Markdown reports

### Analysis depth

| Depth | What runs |
|-------|-----------|
| `quick` | Core 9 rules |
| `standard` | + misplaced tier, dynamic imports, comment-aware impurity (default) |
| `deep` | + ts-morph graph, re-export boundaries |
| `exhaustive` | + import cycles, coupling hotspots |

### Presets

`apps` · `imports` · `structure` · `quality` · `standard` · `full` · `exhaustive`

## Develop

Requires **Node.js 22+**.

```bash
git clone https://github.com/Underwood-Inc/clad-audit.git
cd clad-audit
npm install
npm test
npm run build
```

## Publish to npm

From this repo root (after login + 2FA):

```bash
npm run build
npm publish --access public
```

## License

MIT — see [LICENSE](./LICENSE).
