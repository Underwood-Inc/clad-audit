import type { AnalysisDepth, CladAuditConfig, CladAuditResult, CladFinding, RuleContext } from '../motes/types.js';
import { depthAtLeast } from '../motes/types.js';
import { createAnalysisContext } from './analysisContext.js';
import { ALL_CLAD_RULES } from '../rules/index.js';

export type AuditEngineInput = {
  rootDir: string;
  config: CladAuditConfig;
  rules?: string[];
  depth?: AnalysisDepth;
};

export async function auditEngine(input: AuditEngineInput): Promise<CladAuditResult> {
  const started = performance.now();
  const depth = input.depth ?? input.config.analysis.defaultDepth;
  const { scanSourceFiles } = await import('../plugs/node/scanSourceFiles.js');
  const files = await scanSourceFiles(input.rootDir, input.config);
  const analysis = await createAnalysisContext(input.rootDir, files, input.config, depth);

  const ctx: RuleContext = {
    rootDir: input.rootDir,
    config: input.config,
    files,
    analysis,
  };

  const selected =
    input.rules && input.rules.length > 0
      ? ALL_CLAD_RULES.filter((r) => input.rules!.includes(r.id))
      : ALL_CLAD_RULES.filter((r) => depthAtLeast(depth, r.minDepth));

  const findings: CladFinding[] = [];
  for (const rule of selected) {
    findings.push(...rule.run(ctx));
  }

  findings.sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    const pathCmp = a.filePath.localeCompare(b.filePath);
    if (pathCmp !== 0) return pathCmp;
    return (a.line ?? 0) - (b.line ?? 0);
  });

  const summaryByRule: Record<string, number> = {};
  const summaryByTier: CladAuditResult['summaryByTier'] = {};
  for (const f of findings) {
    summaryByRule[f.rule] = (summaryByRule[f.rule] ?? 0) + 1;
    if (f.tier) summaryByTier[f.tier] = (summaryByTier[f.tier] ?? 0) + 1;
  }

  const errors = findings.filter((f) => f.severity === 'error').length;
  return {
    ok: errors === 0,
    filesScanned: files.length,
    findings,
    summaryByRule,
    summaryByTier,
    analysisDepth: depth,
    durationMs: Math.round(performance.now() - started),
    importEdgesAnalyzed: analysis.importEdges.length,
  };
}

function severityRank(severity: CladFinding['severity']): number {
  if (severity === 'error') return 3;
  if (severity === 'warning') return 2;
  return 1;
}
