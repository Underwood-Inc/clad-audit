import { describe, expect, test } from 'vitest';
import { defaultCladAuditConfig } from '../motes/defaultConfig.js';

describe('defaultCladAuditConfig', () => {
  test('contains no product-specific filenames or import aliases', () => {
    const json = JSON.stringify(defaultCladAuditConfig());
    const banned = [
      'mappy',
      'mapProfiles',
      'mapCoordinator',
      'maplibre',
      'composeRuneSession',
      'markerMaker',
      'crimson-desert',
    ];
    for (const token of banned) {
      expect(json.toLowerCase()).not.toContain(token.toLowerCase());
    }
    expect(defaultCladAuditConfig().importAliases).toEqual({});
    expect(defaultCladAuditConfig().views.extraViewPaths).toEqual([]);
  });
});
