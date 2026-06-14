import type { CladFinding, CladRule, RuleContext } from '../motes/types.js';
import {
  enrichFinding,
  planAppAllowlistException,
  planCanonAllowlistFix,
  planFileSizeSplit,
  planImportBoundaryFix,
  planMoveToTier,
  planSveltePropsFix,
  planTierImpurityFix,
  reasoningLines,
} from '../recipes/remediationPlan.js';
import {
  firstMatchingLine,
  parseAllImports,
  parseStaticImports,
  stripCommentsAndStrings,
} from '../sparks/importAnalysis.js';
import { rangeForMatchIndex } from '../sparks/findingLocation.js';
import { matchesAnyPattern, resolveImportTier } from '../sparks/pathTier.js';
import { suggestTargetPath } from '../sparks/tierShape.js';
import { DEEP_CLAD_RULES } from './deepRules.js';

export const appTierAllowlistRule: CladRule = {
  id: 'app-tier-allowlist',
  description: 'App tier files must match composition-root filename patterns.',
  defaultAdvice:
    'Move orchestration to recipes/, markup to views/, reactive session runes to organisms/, pure logic to molecules/. Keep only mount*, *AppSession, *AppContext, *Bridge, wire*, and bootstrap in apps/.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const file of ctx.files) {
      if (file.tier !== 'apps') continue;
      if (file.basename.endsWith('.test.ts')) continue;
      if (matchesAnyPattern(file.basename, ctx.config.apps.allowedExceptions)) continue;
      if (matchesAnyPattern(file.basename, ctx.config.apps.allowedFilenamePatterns)) continue;

      const remediation = planAppAllowlistException(file);
      const shapeTarget = suggestTargetPath(file, 'molecules', ctx.config);

      findings.push(
        enrichFinding(
          {
            rule: 'app-tier-allowlist',
            severity: 'error',
            filePath: file.relativePath,
            tier: 'apps',
            message: `App-tier file "${file.basename}" is not a recognized composition-root shape.`,
            advice: `${appTierAllowlistRule.defaultAdvice} Or add a project-specific exception in .clad-audit.yaml → apps.allowedFilenamePatterns if this file is genuinely part of the composition root.`,
            reasoning: reasoningLines(
              'apps/ is reserved for composition roots: mount*, wire*, *AppSession, *Bridge, bootstrap.',
              `Basename "${file.basename}" matches none of the allowedFilenamePatterns.`,
            ),
            remediation: {
              ...remediation,
              suggestedTargetPath: remediation.suggestedTargetPath ?? shapeTarget,
            },
          },
          file,
        ),
      );
    }
    return findings;
  },
};

export const viewInAppTierRule: CladRule = {
  id: 'view-in-app-tier',
  description: 'User-facing markup must not live in the App tier.',
  defaultAdvice:
    'Move .svelte/.tsx/.vue files to views/ (e.g. views/popouts/<app>/) and import them from mount* or *AppSession in apps/.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const file of ctx.files) {
      if (file.tier !== 'apps') continue;
      if (!ctx.config.forbiddenInApps.extensions.includes(file.extension)) continue;
      if (file.extension === '.svelte.ts') continue;

      findings.push(
        enrichFinding(
          {
            rule: 'view-in-app-tier',
            severity: 'error',
            filePath: file.relativePath,
            tier: 'apps',
            expectedTier: 'views',
            message: `View markup (${file.extension}) found in App tier.`,
            advice: viewInAppTierRule.defaultAdvice,
            reasoning: reasoningLines(
              'Views are user-facing markup; apps/ only wires them into the shell.',
              `Extension ${file.extension} is listed in forbiddenInApps.extensions.`,
            ),
            remediation: planMoveToTier(file, 'views', ctx.config, 'Move view markup out of apps/'),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

export const organismInAppTierRule: CladRule = {
  id: 'organism-in-app-tier',
  description: 'Composed session runes belong in Organisms, not App.',
  defaultAdvice:
    'Move *Rune.svelte.ts and non-App *Session.svelte.ts files to organisms/<feature>/ and import them from *AppSession in apps/.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const file of ctx.files) {
      if (file.tier !== 'apps') continue;
      if (!matchesAnyPattern(file.basename, ctx.config.organisms.filenamePatterns)) continue;
      if (matchesAnyPattern(file.basename, ctx.config.organisms.allowedExceptions)) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'organism-in-app-tier',
            severity: 'error',
            filePath: file.relativePath,
            tier: 'apps',
            expectedTier: 'organisms',
            message: `Organism-shaped module "${file.basename}" found in App tier.`,
            advice: organismInAppTierRule.defaultAdvice,
            reasoning: reasoningLines(
              'Organisms compose reactive session state (*Rune.svelte.ts, *Session.svelte.ts).',
              'App tier should import organisms — not host them.',
            ),
            remediation: planMoveToTier(file, 'organisms', ctx.config, 'Move session runes to organisms/'),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

export const recipeInAppTierRule: CladRule = {
  id: 'recipe-in-app-tier',
  description: 'Orchestration / paint registration belongs in Recipes, not App.',
  defaultAdvice:
    'Move register*, *Paint.ts, and similar orchestrators to recipes/ and invoke them from the App composition root (wire* / mount*).',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const file of ctx.files) {
      if (file.tier !== 'apps') continue;
      if (file.basename.endsWith('.test.ts')) continue;
      if (!matchesAnyPattern(file.basename, ctx.config.recipes.filenamePatterns)) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'recipe-in-app-tier',
            severity: 'error',
            filePath: file.relativePath,
            tier: 'apps',
            expectedTier: 'recipes',
            message: `Recipe-shaped orchestrator "${file.basename}" found in App tier.`,
            advice: recipeInAppTierRule.defaultAdvice,
            reasoning: reasoningLines(
              'Recipes register paints, wire subsystems, and orchestrate molecules/organisms.',
              `Basename matches recipes.filenamePatterns.`,
            ),
            remediation: planMoveToTier(file, 'recipes', ctx.config, 'Move orchestration to recipes/'),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

function staticImportViolations(ctx: RuleContext, file: RuleContext['files'][0]): CladFinding[] {
  const findings: CladFinding[] = [];
  const forbidden = ctx.config.importBoundary[file.tier];
  if (!forbidden?.length) return findings;

  type BoundaryImport = { specifier: string; line: number; toTier: ReturnType<typeof resolveImportTier> };
  let imports: BoundaryImport[];

  if (ctx.analysis.importEdges.length > 0) {
    imports = ctx.analysis.importEdges
      .filter(
        (e) =>
          e.fromPath === file.relativePath &&
          (e.kind === 'static' || e.kind === 'side-effect'),
      )
      .map((e) => ({ specifier: e.specifier, line: e.line, toTier: e.toTier }));
  } else {
    imports = parseStaticImports(file.content).map((imp) => ({
      specifier: imp.specifier,
      line: imp.line,
      toTier: resolveImportTier(imp.specifier, file.relativePath, ctx.config),
    }));
  }

  for (const imp of imports) {
    const targetTier = imp.toTier;
    const { specifier, line } = imp;
    if (!targetTier || targetTier === 'unknown') continue;
    if (!forbidden.includes(targetTier)) continue;

    findings.push(
      enrichFinding(
        {
          rule: 'import-boundary',
          severity: 'error',
          filePath: file.relativePath,
          line,
          tier: file.tier,
          expectedTier: targetTier,
          importSpecifier: specifier,
          message: `${file.tier} must not import from ${targetTier} ("${specifier}").`,
          advice: importBoundaryRule.defaultAdvice,
          reasoning: reasoningLines(
            `Import boundary matrix forbids ${file.tier} → ${targetTier}.`,
            'CLAD dependency flow is inward: outer tiers may depend on inner tiers, not vice versa.',
          ),
          remediation: planImportBoundaryFix(file, file.tier, targetTier, specifier, ctx.config),
        },
        file,
      ),
    );
  }
  return findings;
}

export const importBoundaryRule: CladRule = {
  id: 'import-boundary',
  description: 'Imports must respect inward CLAD dependency direction.',
  defaultAdvice:
    'Depend inward: outer tiers import inner tiers only. Move shared logic down a tier (Molecule) or expose a Socket contract instead of importing from a higher tier.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const file of ctx.files) {
      findings.push(...staticImportViolations(ctx, file));
    }
    return findings;
  },
};

export const tierImpurityRule: CladRule = {
  id: 'tier-impurity',
  description: 'Inner tiers must stay framework- and adapter-free.',
  defaultAdvice:
    'Extract framework hooks, Svelte runes, and storage clients to Organisms (composition) or Plugs (adapters). Keep Molecules/Sockets pure and testable.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    const useStripped = ctx.analysis.depth !== 'quick';
    const contentFor = (file: RuleContext['files'][0]) =>
      useStripped ? stripCommentsAndStrings(file.content) : file.content;

    for (const file of ctx.files) {
      const rules = ctx.config.tierImpurity[file.tier];
      if (!rules) continue;
      const scan = contentFor(file);

      for (const sub of rules.bannedImportSubstrings) {
        if (scan.includes(sub)) {
          const line = firstMatchingLine(file.content, (line) => line.includes(sub), useStripped);
          findings.push(
            enrichFinding(
              {
                rule: 'tier-impurity',
                severity: 'error',
                filePath: file.relativePath,
                line,
                tier: file.tier,
                message: `${file.tier} tier references forbidden import/content "${sub}".`,
                advice: tierImpurityRule.defaultAdvice,
                reasoning: reasoningLines(
                  useStripped
                    ? 'Match found in code (comments/strings stripped at standard+ depth).'
                    : 'Match found in file content.',
                  `${file.tier} must remain framework-agnostic per tierImpurity config.`,
                ),
                remediation: planTierImpurityFix(file, sub),
              },
              file,
            ),
          );
          break;
        }
      }
      for (const pattern of rules.bannedContentPatterns) {
        const re = new RegExp(pattern);
        if (re.test(scan)) {
          const line = firstMatchingLine(file.content, (line) => re.test(line), useStripped);
          findings.push(
            enrichFinding(
              {
                rule: 'tier-impurity',
                severity: 'error',
                filePath: file.relativePath,
                line,
                tier: file.tier,
                message: `${file.tier} tier contains forbidden reactive/framework pattern /${pattern}/.`,
                advice: tierImpurityRule.defaultAdvice,
                reasoning: reasoningLines(`Pattern /${pattern}/ matched in ${file.tier} tier.`),
                remediation: planTierImpurityFix(file, pattern),
              },
              file,
            ),
          );
          break;
        }
      }
    }
    return findings;
  },
};

export const canonParallelAllowlistRule: CladRule = {
  id: 'canon-parallel-allowlist',
  description: 'Parallel ALLOWLIST constants outside Canon Catalog modules drift policy.',
  defaultAdvice:
    'Consolidate allowlists into one table-driven *Catalog.ts Canon Molecule; use projection modules for labels only.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    if (!ctx.config.canonAllowlist.enabled) return [];
    const findings: CladFinding[] = [];
    const allowlistRe = new RegExp(
      `(?:const|export const)\\s+(${ctx.config.canonAllowlist.allowlistNamePattern})`,
      'g',
    );
    const catalogRe = new RegExp(ctx.config.canonAllowlist.catalogFilenamePattern);

    for (const file of ctx.files) {
      if (file.tier !== 'molecules') continue;
      if (catalogRe.test(file.basename)) continue;
      const matches = [...file.content.matchAll(allowlistRe)];
      for (const match of matches) {
        const constName = match[1] ?? 'ALLOWLIST';
        const at = match.index ?? 0;
        const loc = rangeForMatchIndex(file.content, at, match[0].length);
        findings.push(
          enrichFinding(
            {
              rule: 'canon-parallel-allowlist',
              severity: 'warning',
              filePath: file.relativePath,
              line: loc.line,
              column: loc.column,
              endLine: loc.endLine,
              endColumn: loc.endColumn,
              tier: 'molecules',
              message: `Parallel allowlist constant "${constName}" outside a Catalog module.`,
              advice: canonParallelAllowlistRule.defaultAdvice,
              reasoning: reasoningLines(
                'Canon Molecules use one table-driven Catalog as source of truth.',
                `Constant name matches allowlistNamePattern; file is not a Catalog module.`,
              ),
              remediation: planCanonAllowlistFix(file, constName),
            },
            file,
          ),
        );
      }
    }
    return findings;
  },
};

export const fileSizeTierRule: CladRule = {
  id: 'file-size-tier',
  description: 'Oversized files often indicate wrong tier or missing decomposition.',
  defaultAdvice:
    'Split by tier: extract pure helpers to Molecules, orchestration to Recipes, UI to Views, session wiring to Organisms. Target one clear job per file.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    const findings: CladFinding[] = [];
    for (const file of ctx.files) {
      const limit = ctx.config.fileSize[file.tier];
      if (!limit) continue;
      if (file.lineCount <= limit.maxLines) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'file-size-tier',
            severity: limit.severity,
            filePath: file.relativePath,
            tier: file.tier,
            message: `${file.tier} file has ${file.lineCount} lines (limit ${limit.maxLines}).`,
            advice: fileSizeTierRule.defaultAdvice,
            reasoning: reasoningLines(
              'Large files often mix tiers — a smell for CLAD decomposition.',
              `${file.lineCount} lines exceeds fileSize.${file.tier}.maxLines (${limit.maxLines}).`,
            ),
            remediation: planFileSizeSplit(file, limit.maxLines),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

export const sveltePropsRule: CladRule = {
  id: 'svelte-props-excess',
  description: 'Svelte components with many props violate CLAD composability.',
  defaultAdvice:
    'Introduce an AppSession context (setContext/getContext) or a typed spec object; keep View components ≤4 props.',
  minDepth: 'quick',
  run(ctx: RuleContext): CladFinding[] {
    if (!ctx.config.svelteProps.enabled) return [];
    const findings: CladFinding[] = [];
    const max = ctx.config.svelteProps.maxProps;
    for (const file of ctx.files) {
      if (file.extension !== '.svelte') continue;
      const count = countSvelteProps(file.content);
      if (count <= max) continue;

      findings.push(
        enrichFinding(
          {
            rule: 'svelte-props-excess',
            severity: ctx.config.svelteProps.severity,
            filePath: file.relativePath,
            tier: file.tier,
            message: `Svelte component declares ${count} props (limit ${max}).`,
            advice: sveltePropsRule.defaultAdvice,
            reasoning: reasoningLines(
              'Views should have narrow prop surfaces; session state belongs in AppSession/Organisms.',
              `Detected ${count} destructured $props() bindings.`,
            ),
            remediation: planSveltePropsFix(file, count, max),
          },
          file,
        ),
      );
    }
    return findings;
  },
};

/** Count destructured `$props()` bindings (approximation aligned with ESLint rule). */
export function countSvelteProps(source: string): number {
  const block = source.match(/\$props\s*\(\s*\)/);
  if (!block) return 0;
  const destructure = source.match(/\{\s*([^}]+)\s*\}\s*=\s*\$props\s*\(\s*\)/s);
  if (!destructure?.[1]) return 0;
  const inner = destructure[1];
  if (inner.includes('...')) {
    const named = inner.split('...')[0];
    return named.split(',').filter((p) => p.trim().length > 0).length + 1;
  }
  return inner.split(',').filter((p) => p.trim().length > 0).length;
}

const CORE_CLAD_RULES: CladRule[] = [
  appTierAllowlistRule,
  viewInAppTierRule,
  organismInAppTierRule,
  recipeInAppTierRule,
  importBoundaryRule,
  tierImpurityRule,
  canonParallelAllowlistRule,
  fileSizeTierRule,
  sveltePropsRule,
];

export const ALL_CLAD_RULES: CladRule[] = [...CORE_CLAD_RULES, ...DEEP_CLAD_RULES];

export function ruleCatalog(): { id: string; description: string; defaultAdvice: string; minDepth: string }[] {
  return ALL_CLAD_RULES.map((r) => ({
    id: r.id,
    description: r.description,
    defaultAdvice: r.defaultAdvice,
    minDepth: r.minDepth,
  }));
}

export { parseAllImports };
