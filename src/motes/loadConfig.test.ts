import { describe, expect, test } from 'vitest';
import { defaultCladAuditConfig } from '../motes/defaultConfig.js';
import { mergeCladAuditConfig } from '../motes/loadConfig.js';

describe('loadConfig', () => {
  test('merge preserves defaults and overrides tiers', () => {
    const merged = mergeCladAuditConfig({
      srcRoot: 'lib',
      tiers: { molecules: 'domain' },
    });
    expect(merged.srcRoot).toBe('lib');
    expect(merged.tiers.molecules).toBe('domain');
    expect(merged.tiers.apps).toBe(defaultCladAuditConfig().tiers.apps);
  });
});
