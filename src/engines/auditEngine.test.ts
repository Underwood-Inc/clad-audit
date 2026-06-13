import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { auditEngine } from '../engines/auditEngine.js';
import { mergeCladAuditConfig } from '../motes/loadConfig.js';

describe('auditEngine integration', () => {
  test('scans fixture tree and reports view-in-app-tier', async () => {
    const root = mkdtempSync(join(tmpdir(), 'clad-audit-'));
    mkdirSync(join(root, 'src/apps/demo'), { recursive: true });
    writeFileSync(join(root, 'src/apps/demo/mountDemo.ts'), 'export {};\n');
    writeFileSync(join(root, 'src/apps/demo/DemoPanel.svelte'), '<div></div>\n');

    const result = await auditEngine({
      rootDir: root,
      config: mergeCladAuditConfig({}),
    });

    expect(result.filesScanned).toBeGreaterThanOrEqual(2);
    expect(result.findings.some((f) => f.rule === 'view-in-app-tier')).toBe(true);
    expect(result.findings.every((f) => f.advice.length > 0)).toBe(true);
  });
});
