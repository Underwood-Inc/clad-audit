import { describe, expect, test } from 'vitest';
import { defaultCladAuditConfig } from '../motes/defaultConfig.js';
import { mergeCladAuditConfig } from '../motes/loadConfig.js';
import {
  countLines,
  globToRegExp,
  matchesAnyPattern,
  normalizeRelativePath,
  parseStaticImports,
  resolveImportTier,
  tierForRelativePath,
} from '../sparks/pathTier.js';

describe('pathTier', () => {
  const config = defaultCladAuditConfig();

  test('normalizes windows paths', () => {
    expect(normalizeRelativePath('src\\apps\\foo.ts')).toBe('src/apps/foo.ts');
  });

  test('resolves standard tier folders', () => {
    expect(tierForRelativePath('src/molecules/foo.ts', config)).toBe('molecules');
    expect(tierForRelativePath('src/apps/mountApp.ts', config)).toBe('apps');
    expect(tierForRelativePath('src/views/panels/Foo.svelte', config)).toBe('views');
  });

  test('extraViewPaths are config-driven', () => {
    const custom = mergeCladAuditConfig({
      views: { extraViewPaths: ['ui/components'], extensions: ['.svelte'] },
    });
    expect(tierForRelativePath('src/ui/components/app-root.ts', custom)).toBe('views');
  });

  test('matches allowlist patterns', () => {
    expect(matchesAnyPattern('mountMarkerMaker.ts', config.apps.allowedFilenamePatterns)).toBe(true);
    expect(matchesAnyPattern('markerMakerNavSession.svelte.ts', config.apps.allowedFilenamePatterns)).toBe(
      false,
    );
  });

  test('parses static imports', () => {
    const src = `import x from './foo.js';\nimport type { Y } from '../recipes/bar.js';`;
    expect(parseStaticImports(src)).toEqual([
      { specifier: './foo.js', line: 1 },
      { specifier: '../recipes/bar.js', line: 2 },
    ]);
  });

  test('resolves relative import tier', () => {
    const tier = resolveImportTier('../recipes/coordinatorUi/paint.ts', 'src/molecules/a.ts', config);
    expect(tier).toBe('recipes');
  });

  test('glob ** matches nested paths', () => {
    expect(globToRegExp('**/dist/**').test('src/dist/foo')).toBe(true);
  });

  test('countLines', () => {
    expect(countLines('a\nb\n')).toBe(3);
  });
});
