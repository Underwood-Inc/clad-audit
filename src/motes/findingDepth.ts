import type { AnalysisDepth, CladFinding } from './types.js';
import { DEPTH_ORDER } from './types.js';

const DEPTH_LABEL: Record<AnalysisDepth, string> = {
  quick: 'quick',
  standard: 'standard',
  deep: 'deep',
  exhaustive: 'exhaustive',
};

export function depthIndex(depth: AnalysisDepth): number {
  return DEPTH_ORDER.indexOf(depth);
}

/** Analysis depths shallower than ruleMinDepth where this finding would not be reported. */
export function depthsWhereFindingHidden(ruleMinDepth: AnalysisDepth): AnalysisDepth[] {
  const minIdx = depthIndex(ruleMinDepth);
  return DEPTH_ORDER.slice(0, minIdx);
}

export function findingVisibleAtDepth(finding: Pick<CladFinding, 'ruleMinDepth'>, depth: AnalysisDepth): boolean {
  if (!finding.ruleMinDepth) return true;
  return depthIndex(depth) >= depthIndex(finding.ruleMinDepth);
}

/**
 * Plain-language note for reviewers: when a finding only appears at deeper analysis passes.
 */
export function describeFindingDepthExposure(
  finding: Pick<CladFinding, 'ruleMinDepth'>,
  auditDepth: AnalysisDepth,
): string | undefined {
  if (!finding.ruleMinDepth) return undefined;

  const hidden = depthsWhereFindingHidden(finding.ruleMinDepth);
  if (hidden.length === 0) {
    return 'Visible at all analysis depths (quick and deeper)';
  }

  const hiddenLabel = hidden.map((d) => DEPTH_LABEL[d]).join(', ');
  const minLabel = DEPTH_LABEL[finding.ruleMinDepth];

  if (hidden.length === DEPTH_ORDER.length - 1) {
    return `Requires ${minLabel} analysis — not reported at ${hiddenLabel}`;
  }

  return `Requires at least ${minLabel} — hidden when auditing at ${hiddenLabel}`;
}

/** Short badge for CLI / tree (omit when finding is visible everywhere). */
export function findingDepthBadge(
  finding: Pick<CladFinding, 'ruleMinDepth'>,
): string | undefined {
  if (!finding.ruleMinDepth || finding.ruleMinDepth === 'quick') return undefined;
  if (finding.ruleMinDepth === 'standard') return 'min depth: standard';
  if (finding.ruleMinDepth === 'deep') return 'min depth: deep';
  return 'exhaustive only';
}

export function summarizeFindingsByRuleMinDepth(
  findings: readonly Pick<CladFinding, 'ruleMinDepth'>[],
): Partial<Record<AnalysisDepth, number>> {
  const out: Partial<Record<AnalysisDepth, number>> = {};
  for (const finding of findings) {
    const key = finding.ruleMinDepth ?? 'quick';
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
