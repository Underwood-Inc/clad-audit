import { describe, expect, test } from 'vitest';
import { mergeCladAuditConfig } from '../motes/loadConfig.js';
import type { AnalysisContext, RuleContext, ScannedFile } from '../motes/types.js';
import {
  appTierAllowlistRule,
  canonParallelAllowlistRule,
  countSvelteProps,
  fileSizeTierRule,
  importBoundaryRule,
  organismInAppTierRule,
  recipeInAppTierRule,
  tierImpurityRule,
  viewInAppTierRule,
} from '../rules/index.js';
import { misplacedTierShapeRule } from '../rules/deepRules.js';

function analysisFor(files: ScannedFile[]): AnalysisContext {
  return {
    depth: 'exhaustive',
    importEdges: [],
    fileByPath: new Map(files.map((f) => [f.relativePath, f])),
  };
}

function ctx(files: ScannedFile[], patch?: Parameters<typeof mergeCladAuditConfig>[0]): RuleContext {
  return {
    rootDir: '/proj',
    config: mergeCladAuditConfig(patch ?? {}),
    files,
    analysis: analysisFor(files),
  };
}

function file(partial: Partial<ScannedFile> & Pick<ScannedFile, 'relativePath' | 'tier'>): ScannedFile {
  const basename = partial.relativePath.split('/').pop() ?? partial.relativePath;
  const extension = basename.includes('.') ? `.${basename.split('.').pop()}` : '';
  return {
    absolutePath: `/proj/${partial.relativePath}`,
    basename,
    extension,
    lineCount: partial.lineCount ?? partial.content?.split('\n').length ?? 1,
    content: partial.content ?? '',
    ...partial,
  };
}

describe('view-in-app-tier', () => {
  test('[FR-001] flags svelte in apps', () => {
    const findings = viewInAppTierRule.run(
      ctx([file({ relativePath: 'src/apps/markerMaker/Foo.svelte', tier: 'apps' })]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('view-in-app-tier');
    expect(findings[0].advice).toContain('views/');
  });
});

describe('organism-in-app-tier', () => {
  test('[FR-001] flags rune modules but allows AppSession', () => {
    const bad = organismInAppTierRule.run(
      ctx([file({ relativePath: 'src/apps/foo/fooRune.svelte.ts', tier: 'apps' })]),
    );
    expect(bad).toHaveLength(1);
    const ok = organismInAppTierRule.run(
      ctx([file({ relativePath: 'src/apps/foo/fooAppSession.svelte.ts', tier: 'apps' })]),
    );
    expect(ok).toHaveLength(0);
  });
});

describe('recipe-in-app-tier', () => {
  test('[FR-001] flags register* orchestrators in apps', () => {
    const findings = recipeInAppTierRule.run(
      ctx([file({ relativePath: 'src/apps/map/registerMapPaints.ts', tier: 'apps' })]),
    );
    expect(findings[0].expectedTier).toBe('recipes');
  });
});

describe('app-tier-allowlist', () => {
  test('[FR-001] allows mount and rejects random ts', () => {
    const ok = appTierAllowlistRule.run(
      ctx([file({ relativePath: 'src/apps/x/mountX.ts', tier: 'apps' })]),
    );
    expect(ok).toHaveLength(0);
    const bad = appTierAllowlistRule.run(
      ctx([file({ relativePath: 'src/apps/x/randomHelper.ts', tier: 'apps' })]),
    );
    expect(bad).toHaveLength(1);
    expect(bad[0].advice).toMatch(/recipes|views|organisms|molecules/);
  });
});

describe('import-boundary', () => {
  test('[FR-002] molecule must not import recipe', () => {
    const findings = importBoundaryRule.run(
      ctx([
        file({
          relativePath: 'src/molecules/a.ts',
          tier: 'molecules',
          content: "import { x } from '../recipes/foo.js';",
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('import-boundary');
  });
});

describe('tier-impurity', () => {
  test('[FR-003] molecule with $state is impure', () => {
    const findings = tierImpurityRule.run(
      ctx([
        file({
          relativePath: 'src/molecules/a.ts',
          tier: 'molecules',
          content: 'let x = $state(0);',
        }),
      ]),
    );
    expect(findings.length).toBeGreaterThan(0);
  });
});

describe('canon-parallel-allowlist', () => {
  test('[FR-005] warns on allowlist outside catalog', () => {
    const findings = canonParallelAllowlistRule.run(
      ctx([
        file({
          relativePath: 'src/molecules/fooPolicy.ts',
          tier: 'molecules',
          content: 'export const FOO_ALLOWLIST = new Set([1]);',
        }),
      ]),
    );
    expect(findings[0].rule).toBe('canon-parallel-allowlist');
  });

  test('[FR-005] skips Catalog modules', () => {
    const findings = canonParallelAllowlistRule.run(
      ctx([
        file({
          relativePath: 'src/molecules/fooCatalog.ts',
          tier: 'molecules',
          content: 'export const FOO_ALLOWLIST = new Set([1]);',
        }),
      ]),
    );
    expect(findings).toHaveLength(0);
  });
});

describe('countSvelteProps', () => {
  test('[FR-006] counts destructured props', () => {
    const src = `let { a, b, c, d, e } = $props();`;
    expect(countSvelteProps(src)).toBe(5);
  });
});

describe('misplaced-tier-shape', () => {
  test('[FR-004] flags view-shaped file in molecules tier', () => {
    const findings = misplacedTierShapeRule.run(
      ctx([
        file({
          relativePath: 'src/molecules/Panel.svelte',
          tier: 'molecules',
          extension: '.svelte',
          content: '<div></div>',
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.rule).toBe('misplaced-tier-shape');
    expect(findings[0]?.expectedTier).toBe('views');
  });
});

describe('file-size-tier', () => {
  test('[FR-007] flags oversized molecule file', () => {
    const findings = fileSizeTierRule.run(
      ctx([
        file({
          relativePath: 'src/molecules/big.ts',
          tier: 'molecules',
          lineCount: 2000,
          content: 'x\n'.repeat(2000),
        }),
      ]),
    );
    expect(findings.some((f) => f.rule === 'file-size-tier')).toBe(true);
  });
});
