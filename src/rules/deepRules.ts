import type { CladFinding, CladRule, RuleContext } from '../motes/types.js';
import { findImportCycles, fanInByPath } from '../plugs/node/importGraph.js';
import {
  enrichFinding,
  planImportBoundaryFix,
  reasoningLines,
} from '../recipes/remediationPlan.js';
import {
  detectFileShape,
  expectedTierForShape,
  suggestTargetPath,
} from '../sparks/tierShape.js';
import { normalizeRelativePath } from '../sparks/pathTier.js';
import { planMoveToTier } from '../recipes/remediationPlan.js';

/** Files under srcRoot that do not map to a known CLAD tier folder. */
export const unknownTierFileRule: CladRule = {
  id: 'unknown-tier-file',
  description: 'Source files outside recognized CLAD tier folders.',
  defaultAdvice:
    'Move the file into atoms/, molecules/, organisms/, recipes/, views/, apps/, sockets/, or plugs/ — or add a tier mapping in .clad-audit.yaml.',
  minDepth: 'standard',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    const srcPrefix = normalizeRelativePath(ctx.config.srcRoot);

    for (const file of ctx.files) {
      if (file.tier !== 'unknown') continue;
      if (!file.relativePath.startsWith(`${srcPrefix}/`)) continue;
      if (file.basename.endsWith('.test.ts') || file.basename.endsWith('.spec.ts')) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'unknown-tier-file',
            severity: 'warning',
            filePath: file.relativePath,
            tier: 'unknown',
            message: `File is under ${srcPrefix}/ but not in a configured CLAD tier path.`,
            advice: unknownTierFileRule.defaultAdvice,
            reasoning: reasoningLines(
              `Path "${file.relativePath}" did not match any config.tiers folder prefix.`,
              'Unknown-tier files bypass most placement and boundary rules.',
            ),
            remediation: {
              summary: 'Assign a CLAD tier folder',
              steps: [
                {
                  action: 'move',
                  summary: 'Move to the tier matching the file’s responsibility',
                  details:
                    'Pure logic → molecules/, UI → views/, runes → organisms/, orchestration → recipes/, mount → apps/.',
                },
                {
                  action: 'configure',
                  summary: 'Or extend config.tiers / views.extraViewPaths if layout is intentional',
                },
              ],
            },
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** View/organism/recipe shapes found outside their canonical tier (any folder). */
export const misplacedTierShapeRule: CladRule = {
  id: 'misplaced-tier-shape',
  description: 'Filename/extension shape implies a different CLAD tier than its folder.',
  defaultAdvice:
    'Move the file to the tier implied by its shape (views/, organisms/, recipes/) and update imports from the composition root.',
  minDepth: 'standard',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];

    for (const file of ctx.files) {
      const shape = detectFileShape(file, ctx.config);
      const expected = expectedTierForShape(shape);
      if (!expected || expected === file.tier) continue;
      if (shape === 'composition-root' && file.tier === 'apps') continue;
      // app-tier rules already cover composition-root violations in apps/
      if (file.tier === 'apps' && shape !== 'composition-root') continue;

      const target = suggestTargetPath(file, expected, ctx.config);
      findings.push(
        enrichFinding(
          {
            rule: 'misplaced-tier-shape',
            severity: 'error',
            filePath: file.relativePath,
            tier: file.tier,
            expectedTier: expected,
            message: `Shape "${shape}" belongs in ${expected} tier, found in ${file.tier}.`,
            advice: misplacedTierShapeRule.defaultAdvice,
            reasoning: reasoningLines(
              `Basename/extension "${file.basename}" matches ${shape} heuristics.`,
              `Folder placement resolves to tier "${file.tier}".`,
              `CLAD expects ${shape} modules under ${expected}/.`,
            ),
            remediation: planMoveToTier(
              file,
              expected,
              ctx.config,
              `Relocate ${shape} from ${file.tier} to ${expected}`,
            ),
            relatedPaths: [target],
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** Re-exports that violate import boundary (deep analysis). */
export const importReexportBoundaryRule: CladRule = {
  id: 'import-reexport-boundary',
  description: 'Re-export chains must not expose forbidden tier dependencies.',
  defaultAdvice:
    'Remove the re-export or move the symbol to an inner tier. Barrel files must not bridge upward imports.',
  minDepth: 'deep',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const edge of ctx.analysis.importEdges) {
      if (edge.kind !== 'reexport') continue;
      const forbidden = ctx.config.importBoundary[edge.fromTier];
      if (!forbidden?.length || !edge.toTier) continue;
      if (!forbidden.includes(edge.toTier)) continue;

      const file = ctx.analysis.fileByPath.get(edge.fromPath);
      if (!file) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'import-reexport-boundary',
            severity: 'error',
            filePath: edge.fromPath,
            line: edge.line,
            tier: edge.fromTier,
            expectedTier: edge.toTier,
            importSpecifier: edge.specifier,
            message: `${edge.fromTier} re-exports from forbidden ${edge.toTier} ("${edge.specifier}").`,
            advice: importReexportBoundaryRule.defaultAdvice,
            reasoning: reasoningLines(
              'Re-exports inherit dependency direction — consumers see the forbidden tier.',
              `Edge kind: ${edge.kind}, line ${edge.line}.`,
            ),
            remediation: planImportBoundaryFix(
              file,
              edge.fromTier,
              edge.toTier,
              edge.specifier,
              ctx.config,
            ),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** Dynamic import() / require() crossing forbidden boundaries. */
export const importDynamicBoundaryRule: CladRule = {
  id: 'import-dynamic-boundary',
  description: 'Dynamic imports and require() must obey the same inward matrix as static imports.',
  defaultAdvice:
    'Replace dynamic upward imports with dependency injection, Socket ports, or lazy loading from an allowed tier.',
  minDepth: 'standard',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const edge of ctx.analysis.importEdges) {
      if (edge.kind !== 'dynamic' && edge.kind !== 'require') continue;
      const forbidden = ctx.config.importBoundary[edge.fromTier];
      if (!forbidden?.length || !edge.toTier) continue;
      if (!forbidden.includes(edge.toTier)) continue;

      const file = ctx.analysis.fileByPath.get(edge.fromPath);
      if (!file) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'import-dynamic-boundary',
            severity: 'error',
            filePath: edge.fromPath,
            line: edge.line,
            tier: edge.fromTier,
            expectedTier: edge.toTier,
            importSpecifier: edge.specifier,
            message: `${edge.fromTier} uses ${edge.kind}() to reach forbidden ${edge.toTier} ("${edge.specifier}").`,
            advice: importDynamicBoundaryRule.defaultAdvice,
            reasoning: reasoningLines(
              'Dynamic imports are not exempt from CLAD inward dependency rules.',
              `Runtime load would still couple ${edge.fromTier} → ${edge.toTier}.`,
            ),
            remediation: planImportBoundaryFix(
              file,
              edge.fromTier,
              edge.toTier,
              edge.specifier,
              ctx.config,
            ),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** Circular import paths (exhaustive). */
export const importCycleRule: CladRule = {
  id: 'import-cycle',
  description: 'Circular module dependencies complicate tier extraction and testing.',
  defaultAdvice:
    'Break the cycle by extracting shared types/logic to Molecules or introducing a Socket boundary.',
  minDepth: 'exhaustive',
  run(ctx: RuleContext): CladFinding[] {
    const cycles = findImportCycles(
      ctx.analysis.importEdges,
      ctx.config.analysis.maxCyclePathLength,
    );
    const findings: CladFinding[] = [];

    for (const cycle of cycles) {
      const anchor = cycle[0];
      if (!anchor) continue;
      const file = ctx.analysis.fileByPath.get(anchor);
      if (!file) continue;
      findings.push(
        enrichFinding(
          {
            rule: 'import-cycle',
            severity: 'warning',
            filePath: anchor,
            tier: file?.tier,
            message: `Import cycle detected (${cycle.length} modules): ${cycle.join(' → ')}`,
            advice: importCycleRule.defaultAdvice,
            reasoning: reasoningLines(
              'Cycles often indicate mixed tier responsibilities in one dependency loop.',
              'Prefer acyclic graphs aligned with inward CLAD flow.',
            ),
            relatedPaths: cycle,
            remediation: {
              summary: 'Break the import cycle at the highest-tier module',
              steps: [
                {
                  action: 'extract',
                  summary: 'Move shared types/constants to molecules/',
                  details: 'Both sides of the cycle import the extracted module inward.',
                },
                {
                  action: 'refactor',
                  summary: 'Replace mutual imports with a Socket + Plug pair',
                },
              ],
            },
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** index.ts / barrel files re-exporting many tiers (deep). */
export const barrelReexportSmellRule: CladRule = {
  id: 'barrel-reexport-smell',
  description: 'Barrel index files that re-export across CLAD tiers hide boundary violations.',
  defaultAdvice:
    'Prefer direct imports from the owning tier. Limit barrels to one tier or to public API facades at App boundary.',
  minDepth: 'deep',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    const byFile = new Map<string, Set<string>>();

    for (const edge of ctx.analysis.importEdges) {
      if (edge.kind !== 'reexport' || !edge.toTier) continue;
      const base = edge.fromPath.split('/').pop() ?? '';
      if (!/^index\.(ts|tsx|js)$/.test(base)) continue;
      if (!byFile.has(edge.fromPath)) byFile.set(edge.fromPath, new Set());
      byFile.get(edge.fromPath)!.add(edge.toTier);
    }

    for (const [filePath, tiers] of byFile) {
      if (tiers.size < 2) continue;
      const file = ctx.analysis.fileByPath.get(filePath);
      findings.push(
        enrichFinding(
          {
            rule: 'barrel-reexport-smell',
            severity: 'info',
            filePath,
            tier: file?.tier,
            message: `Barrel re-exports span ${tiers.size} CLAD tiers: ${[...tiers].join(', ')}`,
            advice: barrelReexportSmellRule.defaultAdvice,
            reasoning: reasoningLines(
              'Multi-tier barrels make dependency direction hard to audit.',
              'Consumers may accidentally import upward through the barrel.',
            ),
            remediation: {
              summary: 'Split barrel by tier or remove cross-tier re-exports',
              steps: [
                {
                  action: 'split',
                  summary: 'Create per-tier index files or import directly from source modules',
                },
              ],
            },
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** High fan-in modules (exhaustive info). */
export const tierCouplingHotspotRule: CladRule = {
  id: 'tier-coupling-hotspot',
  description: 'Heavily imported modules may be god-objects blocking tier decomposition.',
  defaultAdvice:
    'Split hotspots by tier responsibility or introduce narrow Socket contracts.',
  minDepth: 'exhaustive',
  run(ctx: RuleContext): CladFinding[] {
    const threshold = ctx.config.analysis.couplingHotspotThreshold;
    const fanIn = fanInByPath(ctx.analysis.importEdges);
    const findings: CladFinding[] = [];

    for (const [path, count] of fanIn) {
      if (count < threshold) continue;
      const file = ctx.analysis.fileByPath.get(path);
      if (!file) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'tier-coupling-hotspot',
            severity: 'info',
            filePath: path,
            tier: file.tier,
            message: `Module imported by ${count} other modules (threshold ${threshold}).`,
            advice: tierCouplingHotspotRule.defaultAdvice,
            reasoning: reasoningLines(
              'High fan-in often correlates with mixed concerns or missing tier splits.',
              'Review during CLAD migration — not always a violation.',
            ),
            remediation: {
              summary: 'Audit whether this file mixes tiers or should be split',
              steps: [
                {
                  action: 'split',
                  summary: 'Separate pure logic, UI, and orchestration into tier folders',
                },
                {
                  action: 'document',
                  summary: 'If intentionally shared, document as Canon Molecule',
                },
              ],
            },
          },
          file,
        ),
      );
    }
    return findings;
  },
};

export const DEEP_CLAD_RULES: CladRule[] = [
  unknownTierFileRule,
  misplacedTierShapeRule,
  importDynamicBoundaryRule,
  importReexportBoundaryRule,
  importCycleRule,
  barrelReexportSmellRule,
  tierCouplingHotspotRule,
];
