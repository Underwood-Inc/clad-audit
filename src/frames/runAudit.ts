import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditEngine } from '../engines/auditEngine.js';
import {
  filterFindingsByTierFocus,
  presetById,
  resolvePresetRules,
  type AuditPresetId,
  type CladTierFocus,
} from '../motes/auditPresets.js';
import { loadCladAuditConfig } from '../motes/loadConfig.js';
import type { AnalysisDepth, CladAuditResult } from '../motes/types.js';
import { depthAtLeast } from '../motes/types.js';
import { ALL_CLAD_RULES } from '../rules/index.js';

export type RunAuditInput = {
  rootDir: string;
  configPath: string;
  rules?: string[];
  strict: boolean;
  tierFocus?: CladTierFocus;
  depth?: AnalysisDepth;
};

export type RunAuditOutput = {
  result: CladAuditResult;
  failed: boolean;
  rulesRun: string[];
};

export async function runAudit(input: RunAuditInput): Promise<RunAuditOutput> {
  const rootDir = resolve(input.rootDir);
  const configPath = resolve(rootDir, input.configPath);
  const config = loadCladAuditConfig(existsSync(configPath) ? configPath : undefined);
  const depth = input.depth ?? config.analysis.defaultDepth;
  const rulesRun =
    input.rules?.length
      ? input.rules
      : ALL_CLAD_RULES.filter((r) => depthAtLeast(depth, r.minDepth)).map((r) => r.id);
  const raw = await auditEngine({
    rootDir,
    config,
    rules: input.rules?.length ? input.rules : undefined,
    depth,
  });

  let findings = raw.findings;
  if (input.tierFocus && input.tierFocus !== 'all') {
    const tierPrefixes: Partial<Record<string, string>> = {};
    for (const [tier, path] of Object.entries(config.tiers)) {
      if (path) tierPrefixes[tier] = `${config.srcRoot}/${path}`.replace(/\\/g, '/');
    }
    findings = filterFindingsByTierFocus(findings, input.tierFocus, tierPrefixes);
  }

  const summaryByRule: Record<string, number> = {};
  const summaryByTier: CladAuditResult['summaryByTier'] = {};
  for (const f of findings) {
    summaryByRule[f.rule] = (summaryByRule[f.rule] ?? 0) + 1;
    if (f.tier) summaryByTier[f.tier] = (summaryByTier[f.tier] ?? 0) + 1;
  }

  const result: CladAuditResult = {
    ...raw,
    findings,
    summaryByRule,
    summaryByTier,
    ok: findings.every((f) => f.severity !== 'error'),
  };

  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.filter((f) => f.severity === 'warning').length;
  const failed = errors > 0 || (input.strict && warnings > 0);

  return {
    result,
    failed,
    rulesRun,
  };
}

export async function runAuditWithPreset(
  input: Omit<RunAuditInput, 'rules'> & { presetId: AuditPresetId },
): Promise<RunAuditOutput & { presetLabel: string }> {
  const preset = presetById(input.presetId);
  const rules = resolvePresetRules(preset);
  const out = await runAudit({ ...input, rules });
  return { ...out, presetLabel: preset.label, rulesRun: rules };
}
