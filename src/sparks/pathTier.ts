import type { CladAuditConfig, CladTierId } from '../motes/types.js';

/** Normalize to posix path segments without leading slash. */
export function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '').replace(/^\/+/, '');
}

/** Resolve which CLAD tier owns a file path under `srcRoot`. */
export function tierForRelativePath(relativePath: string, config: CladAuditConfig): CladTierId {
  const normalized = normalizeRelativePath(relativePath);
  const srcPrefix = normalizeRelativePath(config.srcRoot);
  const withoutSrc = normalized.startsWith(`${srcPrefix}/`)
    ? normalized.slice(srcPrefix.length + 1)
    : normalized;

  for (const extra of config.views.extraViewPaths) {
    const viewPrefix = normalizeRelativePath(extra);
    if (withoutSrc === viewPrefix || withoutSrc.startsWith(`${viewPrefix}/`)) {
      return 'views';
    }
  }

  for (const [tier, folder] of Object.entries(config.tiers) as [CladTierId, string | undefined][]) {
    if (!folder) continue;
    const prefix = normalizeRelativePath(folder);
    if (withoutSrc === prefix || withoutSrc.startsWith(`${prefix}/`)) {
      return tier;
    }
  }

  return 'unknown';
}

export function matchesAnyPattern(name: string, patterns: string[]): boolean {
  return patterns.some((pattern) => new RegExp(pattern).test(name));
}

export function isIgnored(relativePath: string, ignoreGlobs: string[]): boolean {
  const normalized = normalizeRelativePath(relativePath);
  for (const glob of ignoreGlobs) {
    const re = globToRegExp(glob);
    if (re.test(normalized)) return true;
  }
  return false;
}

/** Minimal glob → RegExp (`**`, `*`, `{ts,tsx}`). */
export function globToRegExp(glob: string): RegExp {
  const normalized = normalizeRelativePath(glob);
  let re = '^';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '*') {
      if (normalized[i + 1] === '*') {
        re += '.*';
        i++;
      } else {
        re += '[^/]*';
      }
    } else if ('\\.[]{}()+^$|?'.includes(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  }
  re += '$';
  return new RegExp(re);
}

export function countLines(content: string): number {
  if (content.length === 0) return 0;
  return content.split('\n').length;
}

import { parseStaticImports as parseStaticImportsFromAnalysis } from './importAnalysis.js';

export { parseStaticImportsFromAnalysis as parseStaticImports };

export function resolveImportTier(
  specifier: string,
  fromFile: string,
  config: CladAuditConfig,
): CladTierId | null {
  for (const [prefix, tier] of Object.entries(config.importAliases)) {
    if (specifier.startsWith(prefix)) return tier as CladTierId;
  }

  const normalizedFrom = normalizeRelativePath(fromFile);
  const srcPrefix = normalizeRelativePath(config.srcRoot);

  let resolved = specifier;
  if (specifier.startsWith('.')) {
    const fromDir = normalizedFrom.split('/').slice(0, -1);
    const parts = [...fromDir, ...specifier.split('/')];
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    resolved = stack.join('/');
  } else if (!specifier.startsWith('/') && !specifier.includes(':')) {
    resolved = `${srcPrefix}/${specifier}`;
  } else {
    return null;
  }

  return tierForRelativePath(resolved, config);
}
