import type { CladAuditConfig } from './types.js';

/**
 * Generic CLAD defaults from docs/philosophy/clad.md.
 * No project-specific filenames or import aliases — consumers supply `.clad-audit.yaml`
 * in the repository being audited.
 */
export function defaultCladAuditConfig(): CladAuditConfig {
  return {
    srcRoot: 'src',
    tiers: {
      atoms: 'atoms',
      molecules: 'molecules',
      organisms: 'organisms',
      recipes: 'recipes',
      views: 'views',
      apps: 'apps',
      sockets: 'sockets',
      plugs: 'plugs',
    },
    importAliases: {},
    ignoreGlobs: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.d.ts',
      '**/coverage/**',
      '**/.git/**',
    ],
    scanGlobs: ['**/*.{ts,tsx,js,jsx,mjs,cjs,svelte,vue}'],
    apps: {
      allowedFilenamePatterns: [
        '^mount[A-Za-z0-9_-]*\\.(ts|tsx|js)$',
        '^wire[A-Za-z0-9_-]*\\.(ts|tsx|js)$',
        'AppSession\\.(svelte\\.ts|tsx|ts)$',
        'AppContext\\.(ts|tsx)$',
        'App\\.types\\.(ts|tsx)$',
        'Bridge\\.(ts|tsx)$',
        'WireContext\\.types\\.(ts|tsx)$',
        '^create[A-Za-z0-9_-]*\\.(ts|tsx)$',
        '^run[A-Za-z0-9_-]*(Boot|App)\\.(ts|tsx)$',
        '^bootstrap[A-Za-z0-9_-]*\\.(ts|tsx)$',
        '^createApp\\.(ts|tsx)$',
        '\\.(test|spec)\\.(ts|tsx|js)$',
      ],
      allowedExceptions: [],
    },
    forbiddenInApps: {
      extensions: ['.svelte', '.tsx', '.jsx', '.vue'],
      filenamePatterns: [
        '^register[A-Za-z0-9_-]+\\.(ts|tsx)$',
        'Paint\\.(ts|tsx)$',
        'Rune\\.svelte\\.ts$',
        'Session\\.svelte\\.ts$',
      ],
    },
    views: {
      extensions: ['.svelte', '.tsx', '.jsx', '.vue'],
      extraViewPaths: [],
    },
    organisms: {
      filenamePatterns: ['Rune\\.svelte\\.ts$', 'Session\\.svelte\\.ts$'],
      allowedExceptions: ['AppSession\\.svelte\\.ts$'],
    },
    recipes: {
      filenamePatterns: [
        '^register[A-Za-z0-9_-]+\\.(ts|tsx)$',
        'Paint\\.(ts|tsx)$',
        '^run[A-Za-z0-9_-]+\\.(ts|tsx)$',
      ],
    },
    importBoundary: {
      atoms: ['molecules', 'organisms', 'recipes', 'views', 'apps', 'plugs', 'sockets'],
      molecules: ['recipes', 'views', 'apps', 'organisms'],
      sockets: ['plugs', 'recipes', 'views', 'apps', 'organisms', 'molecules'],
      recipes: ['views', 'apps'],
      organisms: ['views', 'apps'],
      views: ['apps'],
      plugs: ['recipes', 'views', 'apps', 'organisms'],
    },
    tierImpurity: {
      molecules: {
        bannedImportSubstrings: [
          '/svelte',
          'svelte/',
          'react',
          'react-dom',
          'vue',
          '@vue/',
        ],
        bannedContentPatterns: ['\\$state\\b', '\\$derived\\b', "from 'svelte", 'from "svelte'],
      },
      sockets: {
        bannedImportSubstrings: ['/plugs/', 'plugs/'],
        bannedContentPatterns: [],
      },
    },
    canonAllowlist: {
      enabled: true,
      allowlistNamePattern: '[A-Z][A-Z0-9_]*_ALLOWLIST',
      catalogFilenamePattern: 'Catalog\\.(ts|tsx)$',
    },
    fileSize: {
      apps: { maxLines: 350, severity: 'warning' },
      molecules: { maxLines: 900, severity: 'warning' },
      recipes: { maxLines: 600, severity: 'warning' },
    },
    svelteProps: {
      enabled: false,
      maxProps: 4,
      severity: 'warning',
    },
    analysis: {
      defaultDepth: 'standard',
      useTsMorph: true,
      maxCyclePathLength: 8,
      couplingHotspotThreshold: 12,
    },
  };
}
