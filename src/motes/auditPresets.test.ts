import { describe, expect, test } from 'vitest';
import { ALL_CLAD_RULES } from '../rules/index.js';
import {
  AUDIT_PRESETS,
  filterFindingsByTierFocus,
  presetById,
  resolvePresetRules,
} from './auditPresets.js';

describe('auditPresets', () => {
  test('[NFR-002] every preset rule id is built-in', () => {
    const builtIn = new Set(ALL_CLAD_RULES.map((r) => r.id));
    for (const preset of AUDIT_PRESETS) {
      if (preset.rules === 'all') continue;
      for (const id of preset.rules) {
        expect(builtIn.has(id), `${preset.id} references unknown rule ${id}`).toBe(true);
      }
    }
  });

  test('[NFR-002] structure preset merges apps and import rules', () => {
    const rules = resolvePresetRules(presetById('structure'));
    expect(rules).toContain('app-tier-allowlist');
    expect(rules).toContain('import-boundary');
    expect(rules).toHaveLength(6);
  });

  test('[NFR-002] full preset runs all rules', () => {
    const rules = resolvePresetRules(presetById('full'));
    expect(rules).toHaveLength(ALL_CLAD_RULES.length);
  });

  test('[NFR-002] filterFindingsByTierFocus keeps tier-tagged and path-matched findings', () => {
    const findings = [
      { rule: 'a', tier: 'apps', filePath: 'src/apps/foo.ts', severity: 'error' as const },
      { rule: 'b', tier: 'molecules', filePath: 'src/molecules/bar.ts', severity: 'error' as const },
      { rule: 'c', filePath: 'src/views/page.svelte', severity: 'error' as const, tier: 'views' as const },
    ];
    const filtered = filterFindingsByTierFocus(findings, 'apps', { apps: 'src/apps' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.filePath).toBe('src/apps/foo.ts');
  });
});
