import type {
  CladAuditConfig,
  CladFinding,
  CladTierId,
  RemediationPlan,
  RemediationStep,
  ScannedFile,
} from '../motes/types.js';
import { suggestTargetPath, tierFolder } from '../sparks/tierShape.js';

export function enrichFinding(base: CladFinding): CladFinding {
  return {
    ...base,
    reasoning: base.reasoning ?? [],
  };
}

export function planMoveToTier(
  file: ScannedFile,
  expectedTier: CladTierId,
  config: CladAuditConfig,
  rationale: string,
): RemediationPlan {
  const target = suggestTargetPath(file, expectedTier, config);
  const steps: RemediationStep[] = [
    {
      action: 'move' as const,
      summary: `Move file to ${target}`,
      details: `git mv ${file.relativePath} ${target} (or your VCS equivalent)`,
    },
    {
      action: 'refactor' as const,
      summary: 'Update all import paths that reference the old location',
      details: `Search the repo for "${file.basename}" and "${file.relativePath}" imports.`,
    },
    {
      action: 'refactor' as const,
      summary: `Wire from ${config.tiers.apps ?? 'apps'}/ composition root if this was app-local`,
      details: 'Import the moved module from mount*, wire*, or *AppSession — not the other way around.',
    },
  ];

  if (expectedTier === 'views') {
    steps.push({
      action: 'document' as const,
      summary: 'Keep props ≤4 or use AppSession context',
      details: 'Views receive data via props/context from Organisms or AppSession — not by importing Recipes.',
    });
  }
  if (expectedTier === 'organisms') {
    steps.push({
      action: 'extract' as const,
      summary: 'Keep pure logic in Molecules; Organism holds runes + composition',
      details: 'If the file mixes pure helpers, extract them to molecules/ first.',
    });
  }
  if (expectedTier === 'recipes') {
    steps.push({
      action: 'refactor' as const,
      summary: 'Invoke recipe from apps/ wire* or mount* only',
      details: 'Recipes orchestrate Molecules/Organisms — they must not live in apps/.',
    });
  }

  return {
    summary: rationale,
    suggestedTargetPath: target,
    steps,
  };
}

export function planImportBoundaryFix(
  file: ScannedFile,
  fromTier: CladTierId,
  toTier: CladTierId,
  specifier: string,
  config: CladAuditConfig,
): RemediationPlan {
  const steps: RemediationStep[] = [
    {
      action: 'refactor' as const,
      summary: `Remove import of higher tier (${toTier}) from ${fromTier}`,
      details: `Line imports "${specifier}" which resolves to tier ${toTier}. CLAD allows inward dependencies only.`,
    },
  ];

  if (fromTier === 'molecules' && (toTier === 'organisms' || toTier === 'recipes' || toTier === 'views')) {
    steps.push({
      action: 'extract' as const,
      summary: 'Push shared logic down into Molecules or expose a Socket contract',
      details:
        'If the Molecule needs UI/session behavior, define a Socket interface in sockets/ and implement in plugs/ or organisms/.',
    });
  }

  if (fromTier === 'views' && toTier === 'apps') {
    steps.push({
      action: 'refactor' as const,
      summary: 'Pass data via props from *AppSession instead of importing apps/',
      details: 'Views must not reach into composition roots — invert the dependency.',
    });
  }

  if (toTier === 'plugs' && fromTier === 'molecules') {
    steps.push({
      action: 'wrap' as const,
      summary: 'Route storage/IO through sockets/ + plugs/ — Molecules stay pure',
      details: `Move adapter code to plugs/; Molecule depends on sockets/${'{contract}'}.ts interface only.`,
    });
  }

  steps.push({
    action: 'document' as const,
    summary: 'Verify inward matrix in docs/philosophy/clad.md',
    details: `${fromTier} → ${toTier} violates the configured importBoundary matrix.`,
  });

  return {
    summary: `Break upward import from ${fromTier} to ${toTier}`,
    steps,
    suggestedTargetPath: tierFolder(config, fromTier),
  };
}

export function planTierImpurityFix(file: ScannedFile, matchedPattern: string): RemediationPlan {
  return {
    summary: `Remove framework/adapter leakage from ${file.tier} tier`,
    steps: [
      {
        action: 'extract' as const,
        summary: 'Move reactive/framework code to organisms/',
        details: `Matched forbidden pattern "${matchedPattern}". Molecules and Sockets must stay framework-agnostic.`,
      },
      {
        action: 'wrap' as const,
        summary: 'Move adapter imports to plugs/ behind sockets/',
        details: 'Define a port in sockets/; implement with plugs/memory or plugs/node as needed.',
      },
      {
        action: 'refactor' as const,
        summary: 'Inject dependencies via function parameters instead of direct imports',
        details: 'Pure functions accept ports/stores as arguments — test with plugs/memory in Vitest.',
      },
    ],
  };
}

export function planFileSizeSplit(file: ScannedFile, maxLines: number): RemediationPlan {
  const tier = file.tier ?? 'unknown';
  return {
    summary: `Split ${file.lineCount}-line file (limit ${maxLines}) by CLAD tier responsibilities`,
    steps: [
      {
        action: 'split' as const,
        summary: 'Identify mixed concerns: UI, orchestration, pure logic, session runes',
        details: 'Each extracted file should map to exactly one CLAD tier.',
      },
      {
        action: 'extract' as const,
        summary: 'Extract pure helpers → molecules/, markup → views/, runes → organisms/',
        details: 'Target ~200–400 lines per file after split.',
      },
      {
        action: 'refactor' as const,
        summary: 'Leave a thin composition root or recipe that wires the pieces',
        details: tier === 'apps' ? 'apps/ should only mount and wire.' : `Keep ${tier}/ focused on one job.`,
      },
    ],
  };
}

export function planCanonAllowlistFix(file: ScannedFile, constName: string): RemediationPlan {
  const catalogName = file.basename.replace(/\.(ts|tsx)$/, 'Catalog.ts');
  return {
    summary: 'Consolidate parallel allowlist into a Canon Catalog molecule',
    steps: [
      {
        action: 'refactor' as const,
        summary: `Merge "${constName}" into a table-driven *Catalog.ts`,
        details: `Create or extend src/molecules/*/${catalogName} with a single source of truth.`,
      },
      {
        action: 'extract' as const,
        summary: 'Use projection modules for labels/display only',
        details: 'No duplicate ALLOWLIST constants — derive views from the catalog table.',
      },
      {
        action: 'delete' as const,
        summary: `Remove "${constName}" from ${file.relativePath} after migration`,
      },
    ],
    suggestedTargetPath: file.relativePath.replace(/[^/]+$/, catalogName),
  };
}

export function planAppAllowlistException(file: ScannedFile): RemediationPlan {
  return {
    summary: 'Either move file to correct tier or document as composition-root exception',
    steps: [
      {
        action: 'move' as const,
        summary: 'Preferred: move to recipes/, views/, organisms/, or molecules/',
        details: 'See suggestedTargetPath if shape detection applies.',
      },
      {
        action: 'configure' as const,
        summary: 'If genuinely part of composition root, add allowedFilenamePatterns exception',
        details: `Add a regex matching "${file.basename}" under apps.allowedFilenamePatterns in .clad-audit.yaml.`,
      },
    ],
    configExceptionYaml: `apps:\n  allowedFilenamePatterns:\n    - '^${escapeRegex(file.basename)}$'`,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function planSveltePropsFix(file: ScannedFile, count: number, max: number): RemediationPlan {
  return {
    summary: `Reduce ${count} props to ≤${max} via context or spec object`,
    steps: [
      {
        action: 'refactor' as const,
        summary: 'Introduce *AppSession with setContext/getContext',
        details: 'Pass a typed session object instead of many individual props.',
      },
      {
        action: 'extract' as const,
        summary: 'Group related props into a single spec/molecule type',
        details: 'e.g. `spec: MarkerEditorSpec` instead of 8 primitive props.',
      },
      {
        action: 'split' as const,
        summary: 'Split into smaller View components with focused prop surfaces',
      },
    ],
  };
}

export function reasoningLines(...lines: string[]): string[] {
  return lines.filter(Boolean);
}
