import { describe, expect, test } from 'vitest';
import { stripAnsi } from '../sparks/terminalStyle.js';
import { formatAuditReport, formatRulesCatalog } from './printAuditReport.js';

const sampleResult = {
  ok: false,
  filesScanned: 10,
  analysisDepth: 'standard' as const,
  durationMs: 42,
  importEdgesAnalyzed: 100,
  findings: [
    {
      rule: 'view-in-app-tier',
      severity: 'error' as const,
      message: 'View markup in apps/',
      advice: 'Move to views/',
      filePath: 'src/apps/Bad.svelte',
      tier: 'apps' as const,
    },
    {
      rule: 'file-size-tier',
      severity: 'warning' as const,
      message: 'File exceeds limit',
      advice: 'Split the module',
      filePath: 'src/recipes/big.ts',
      tier: 'recipes' as const,
    },
  ],
  summaryByRule: { 'view-in-app-tier': 1, 'file-size-tier': 1 },
  summaryByTier: { apps: 1, recipes: 1 },
};

describe('formatAuditReport', () => {
  test('includes finding details without color', () => {
    const text = formatAuditReport(sampleResult, { strict: false, colorEnabled: false });
    expect(stripAnsi(text)).toBe(text);
    expect(text).toContain('CLAD audit report');
    expect(text).toContain('view-in-app-tier');
    expect(text).toContain('src/apps/Bad.svelte');
    expect(text).toContain('→ Move to views/');
    expect(text).toContain('1 error(s)');
    expect(text).toContain('1 warning(s)');
  });

  test('emits ANSI when color enabled', () => {
    const text = formatAuditReport(sampleResult, { strict: true, colorEnabled: true });
    expect(text).not.toBe(stripAnsi(text));
  });

  test('summarizes hidden findings when limited', () => {
    const text = formatAuditReport(sampleResult, {
      strict: false,
      colorEnabled: false,
      findingLimit: 1,
    });
    expect(text).toContain('1 more finding(s) not shown');
  });
});

describe('formatRulesCatalog', () => {
  test('lists rule ids', () => {
    const text = formatRulesCatalog(
      [{ id: 'demo-rule', description: 'Demo', defaultAdvice: 'Fix it' }],
      false,
    );
    expect(text).toContain('demo-rule');
    expect(text).toContain('Advice: Fix it');
  });
});
