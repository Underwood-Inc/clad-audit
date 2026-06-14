import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

import { runAudit } from './runAudit.js';

describe('runAudit config resolution', () => {
  test('[FR-001] loads config when --root and --config paths are not nested under each other', async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'clad-audit-config-'));
    const projectRoot = join(repoRoot, 'apps', 'mappy');
    mkdirSync(join(projectRoot, 'src', 'molecules'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.clad-audit.yaml'),
      ['srcRoot: src', 'apps:', '  allowedFilenamePatterns:', "    - '^mountOnly\\.ts$'"].join('\n'),
    );
    writeFileSync(join(projectRoot, 'src', 'molecules', 'pure.ts'), 'export const x = 1;\n');

    const cwdBefore = process.cwd();
    try {
      process.chdir(repoRoot);
      const out = await runAudit({
        rootDir: projectRoot,
        configPath: join('apps', 'mappy', '.clad-audit.yaml'),
        strict: false,
        depth: 'quick',
      });
      expect(out.result.filesScanned).toBeGreaterThan(0);
      expect(out.result.findings.some((f) => f.rule === 'app-tier-allowlist')).toBe(false);
    } finally {
      process.chdir(cwdBefore);
    }
  });
});
