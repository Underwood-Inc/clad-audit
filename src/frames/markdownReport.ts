import type { CladAuditResult, CladFinding } from '../motes/types.js';

/** Full markdown audit report for CI artifacts and review. */
export function formatMarkdownReport(result: CladAuditResult, meta?: { preset?: string; root?: string }): string {
  const lines: string[] = [];
  lines.push('# CLAD audit report');
  lines.push('');
  if (meta?.root) lines.push(`**Root:** \`${meta.root}\``);
  if (meta?.preset) lines.push(`**Preset:** ${meta.preset}`);
  lines.push(`**Depth:** ${result.analysisDepth}`);
  lines.push(`**Duration:** ${result.durationMs}ms`);
  lines.push(`**Files scanned:** ${result.filesScanned}`);
  if (result.importEdgesAnalyzed != null) {
    lines.push(`**Import edges analyzed:** ${result.importEdgesAnalyzed}`);
  }
  lines.push('');

  const errs = result.findings.filter((f) => f.severity === 'error').length;
  const warns = result.findings.filter((f) => f.severity === 'warning').length;
  const infos = result.findings.filter((f) => f.severity === 'info').length;
  lines.push(`## Summary`);
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Errors | ${errs} |`);
  lines.push(`| Warnings | ${warns} |`);
  lines.push(`| Info | ${infos} |`);
  lines.push(`| **Total** | **${result.findings.length}** |`);
  lines.push('');

  if (Object.keys(result.summaryByRule).length) {
    lines.push('## By rule');
    lines.push('');
    for (const [rule, count] of Object.entries(result.summaryByRule).sort((a, b) => b[1] - a[1])) {
      lines.push(`- \`${rule}\`: ${count}`);
    }
    lines.push('');
  }

  lines.push('## Findings');
  lines.push('');

  for (const f of result.findings) {
    lines.push(...formatFindingMarkdown(f));
    lines.push('');
  }

  if (result.findings.length === 0) {
    lines.push('_No CLAD violations found._');
  }

  return lines.join('\n');
}

function formatFindingMarkdown(f: CladFinding): string[] {
  const lines: string[] = [];
  const loc = f.line != null ? `${f.filePath}:${f.line}` : f.filePath;
  lines.push(`### [${f.severity}] ${f.rule} — \`${loc}\``);
  lines.push('');
  lines.push(f.message);
  lines.push('');
  if (f.tier) lines.push(`- **Tier:** ${f.tier}${f.expectedTier ? ` → expected **${f.expectedTier}**` : ''}`);
  if (f.importSpecifier) lines.push(`- **Import:** \`${f.importSpecifier}\``);
  if (f.reasoning?.length) {
    lines.push('');
    lines.push('**Reasoning:**');
    for (const r of f.reasoning) lines.push(`1. ${r}`);
  }
  lines.push('');
  lines.push(`> ${f.advice}`);
  if (f.remediation) {
    lines.push('');
    lines.push(`**Remediation:** ${f.remediation.summary}`);
    if (f.remediation.suggestedTargetPath) {
      lines.push(`- Target path: \`${f.remediation.suggestedTargetPath}\``);
    }
    for (const step of f.remediation.steps) {
      lines.push(`- **${step.action}:** ${step.summary}${step.details ? ` — ${step.details}` : ''}`);
    }
    if (f.remediation.configExceptionYaml) {
      lines.push('');
      lines.push('```yaml');
      lines.push(f.remediation.configExceptionYaml);
      lines.push('```');
    }
  }
  if (f.relatedPaths?.length) {
    lines.push('');
    lines.push(`**Related:** ${f.relatedPaths.map((p) => `\`${p}\``).join(', ')}`);
  }
  return lines;
}
