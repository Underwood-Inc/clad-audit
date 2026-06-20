import type { CladAuditResult } from '../motes/types.js';
import { describeFindingDepthExposure, findingDepthBadge, summarizeFindingsByRuleMinDepth } from '../motes/findingDepth.js';
import { createStyle, type Style } from '../sparks/terminalStyle.js';

export type PrintAuditReportOptions = {
  strict: boolean;
  colorEnabled: boolean;
  /** Max findings to print; remainder summarized. */
  findingLimit?: number;
  /** Rules that were run (for header). */
  rulesRun?: string[];
  /** When true, print reasoning and remediation steps per finding. */
  verbose?: boolean;
  presetLabel?: string;
};

function severityStyle(style: Style, severity: string): (s: string) => string {
  if (severity === 'error') return style.error;
  if (severity === 'warning') return style.warning;
  return style.info;
}

function formatSeverityBadge(style: Style, severity: string): string {
  const paint = severityStyle(style, severity);
  return paint(`[${severity}]`);
}

/** Colorized human-readable audit report. */
export function formatAuditReport(
  result: CladAuditResult,
  options: PrintAuditReportOptions,
): string {
  const style = createStyle(options.colorEnabled);
  const lines: string[] = [];
  const errs = result.findings.filter((f) => f.severity === 'error').length;
  const warns = result.findings.filter((f) => f.severity === 'warning').length;
  const infos = result.findings.filter((f) => f.severity === 'info').length;

  lines.push('');
  lines.push(style.header('CLAD audit report'));
  if (options.presetLabel) {
    lines.push(style.dim(`Preset: ${options.presetLabel}`));
  }
  if (options.rulesRun?.length) {
    lines.push(style.dim(`Rules: ${options.rulesRun.join(', ')}`));
  }
  lines.push('');

  const status =
    errs > 0
      ? style.error(`${errs} error(s)`)
      : style.success('0 errors');
  const warnPart = warns > 0 ? style.warning(`${warns} warning(s)`) : style.dim('0 warnings');
  const infoPart = infos > 0 ? style.info(`${infos} info`) : '';

  lines.push(
    `${style.bold(String(result.filesScanned))} files scanned · ${style.bold(String(result.findings.length))} finding(s) · ${status}, ${warnPart}${infoPart ? `, ${infoPart}` : ''}${options.strict ? style.dim(' · strict') : ''}`,
  );
  lines.push(
    style.dim(
      `Depth: ${result.analysisDepth} · ${result.durationMs}ms${result.importEdgesAnalyzed != null ? ` · ${result.importEdgesAnalyzed} import edges` : ''}`,
    ),
  );
  lines.push('');

  if (Object.keys(result.summaryByRule).length > 0) {
    lines.push(style.bold('By rule'));
    for (const [rule, count] of Object.entries(result.summaryByRule).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${style.rule(rule)} ${style.dim('·')} ${count}`);
    }
    lines.push('');
  }

  const tierEntries = Object.entries(result.summaryByTier ?? {}).filter(([, n]) => (n ?? 0) > 0);
  if (tierEntries.length > 0) {
    lines.push(style.bold('By tier'));
    for (const [tier, count] of tierEntries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))) {
      lines.push(`  ${style.accent(tier)} ${style.dim('·')} ${count}`);
    }
    lines.push('');
  }

  const depthSummary = summarizeFindingsByRuleMinDepth(result.findings);
  const depthEntries = Object.entries(depthSummary).filter(([, n]) => (n ?? 0) > 0);
  if (depthEntries.length > 0) {
    lines.push(style.bold('By rule min depth'));
    for (const [depth, count] of depthEntries.sort(
      (a, b) => a[0].localeCompare(b[0]),
    )) {
      lines.push(`  ${style.accent(depth)} ${style.dim('·')} ${count}`);
    }
    lines.push('');
  }

  const limit = options.findingLimit ?? result.findings.length;
  const shown = result.findings.slice(0, limit);
  const hidden = result.findings.length - shown.length;

  if (shown.length > 0) {
    lines.push(style.bold('Findings'));
    lines.push('');
  }

  for (const f of shown) {
    const where = f.line != null ? style.dim(`:${f.line}`) : '';
    lines.push(
      `${formatSeverityBadge(style, f.severity)} ${style.rule(f.rule)} ${style.path(f.filePath)}${where}`,
    );
    lines.push(`  ${f.message}`);
    const depthBadge = findingDepthBadge(f);
    const depthNote = describeFindingDepthExposure(f, result.analysisDepth);
    if (depthBadge) {
      lines.push(`  ${style.info(`◆ ${depthBadge}`)}${depthNote ? style.dim(` — ${depthNote}`) : ''}`);
    } else if (depthNote && f.ruleMinDepth !== 'quick') {
      lines.push(`  ${style.dim(`◆ ${depthNote}`)}`);
    }
    lines.push(`  ${style.success('→')} ${style.dim(f.advice)}`);
    if (options.verbose && f.reasoning?.length) {
      for (const r of f.reasoning) {
        lines.push(`  ${style.dim('∵')} ${style.dim(r)}`);
      }
    }
    if (options.verbose && f.remediation) {
      lines.push(`  ${style.accent('Fix:')} ${f.remediation.summary}`);
      if (f.remediation.suggestedTargetPath) {
        lines.push(`  ${style.dim('target:')} ${style.path(f.remediation.suggestedTargetPath)}`);
      }
      for (const step of f.remediation.steps.slice(0, 4)) {
        lines.push(`  ${style.dim(`  ${step.action}:`)} ${step.summary}`);
      }
    }
    lines.push('');
  }

  if (hidden > 0) {
    lines.push(style.dim(`… ${hidden} more finding(s) not shown (use --json for full output)`));
    lines.push('');
  }

  if (result.findings.length === 0) {
    lines.push(style.success('No CLAD violations found.'));
    lines.push('');
  }

  return lines.join('\n');
}

export function printAuditReport(result: CladAuditResult, options: PrintAuditReportOptions): void {
  process.stdout.write(`${formatAuditReport(result, options)}\n`);
}

/** Colorized rules catalog. */
export function formatRulesCatalog(
  rules: { id: string; description: string; defaultAdvice: string; minDepth?: string }[],
  colorEnabled: boolean,
): string {
  const style = createStyle(colorEnabled);
  const lines: string[] = [style.header('CLAD audit rules'), ''];
  for (const rule of rules) {
    lines.push(style.rule(rule.id));
    lines.push(`  ${rule.description}`);
    if (rule.minDepth) lines.push(`  ${style.dim(`Min depth: ${rule.minDepth}`)}`);
    lines.push(`  ${style.success('Advice:')} ${style.dim(rule.defaultAdvice)}`);
    lines.push('');
  }
  return lines.join('\n');
}
