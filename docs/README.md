# CLAD documentation (bundled)

These documents ship with **@underwoodinc/clad-audit** so consumers can read the architecture the auditor enforces.

## Canonical spec

| Document | Purpose |
|----------|---------|
| [`philosophy/clad.md`](./philosophy/clad.md) | **Full CLAD spec** — single living document; all depth lives here |

There is **no separate doc suite** upstream — only `docs/philosophy/clad.md`. Depth topics (tiers, imports, Canon Molecules, anti-patterns, TDD, framework guides) are sections inside that file, not standalone files.

## Depth guide — where to read in `clad.md`

Use this index to jump to the sections that explain what clad-audit rules check.

| Topic | Read in `clad.md` | clad-audit rules |
|-------|-------------------|------------------|
| Tier vocabulary (Atom → App) | [The cooking metaphor](./philosophy/clad.md#the-cooking-metaphor) · [The CLAD Stack](./philosophy/clad.md#the-clad-stack--six-tiers-with-code) | all rules |
| Which tier does this belong in? | [Decision flowchart](./philosophy/clad.md#decision-flowchart-which-tier-does-this-code-belong-in) | `misplaced-tier-shape`, `unknown-tier-file` |
| Folder layout | [Directory structure](./philosophy/clad.md#directory-structure) | tier path resolution |
| App / composition root | [The CLAD Stack — App](./philosophy/clad.md#the-clad-stack--six-tiers-with-code) | `app-tier-allowlist`, `view-in-app-tier`, `organism-in-app-tier`, `recipe-in-app-tier` |
| Inward dependencies | [Cross-cutting concepts](./philosophy/clad.md#cross-cutting-concepts-interfaces-implementations-forges-stages) · dependency diagrams in CLAD Stack | `import-boundary`, `import-dynamic-boundary`, `import-reexport-boundary` |
| Pure molecules / sockets | CLAD Stack (Molecule, Socket) · [Anti-patterns](./philosophy/clad.md#anti-patterns-shapes-clad-is-designed-to-prevent) | `tier-impurity` |
| Canon Molecules | [Canon Molecules — one matrix, many projections](./philosophy/clad.md#canon-molecules--one-matrix-many-projections) | `canon-parallel-allowlist` |
| Svelte / React / Vue | [Framework guides](./philosophy/clad.md#framework-guides) | `svelte-props-excess`, view/organism shape rules |
| What to avoid | [Anti-patterns](./philosophy/clad.md#anti-patterns-shapes-clad-is-designed-to-prevent) · [Common pitfalls](./philosophy/clad.md#common-pitfalls-when-adopting-clad) | quality signals, migration hints |
| Testing shape | [TDD: tests first, design second](./philosophy/clad.md#tdd-tests-first-design-second) | (advisory — not a clad-audit rule) |

Then run:

```bash
clad-audit audit --root . --preset structure --verbose
```
