import type { CladAuditConfig, CladTierId, ScannedFile } from '../motes/types.js';
import { matchesAnyPattern, normalizeRelativePath } from './pathTier.js';

export type FileShape =
  | 'view-markup'
  | 'organism-rune'
  | 'recipe-orchestrator'
  | 'composition-root'
  | 'unknown';

/** Detect CLAD-shaped filename regardless of folder placement. */
export function detectFileShape(
  file: Pick<ScannedFile, 'basename' | 'extension' | 'relativePath'>,
  config: CladAuditConfig,
): FileShape {
  if (
    matchesAnyPattern(file.basename, config.organisms.filenamePatterns) &&
    !matchesAnyPattern(file.basename, config.organisms.allowedExceptions)
  ) {
    return 'organism-rune';
  }
  if (
    matchesAnyPattern(file.basename, config.recipes.filenamePatterns) &&
    !file.basename.endsWith('.test.ts')
  ) {
    return 'recipe-orchestrator';
  }
  const viewExts = [...config.views.extensions, '.svelte'];
  if (viewExts.includes(file.extension)) {
    return 'view-markup';
  }
  if (
    matchesAnyPattern(file.basename, config.apps.allowedFilenamePatterns) ||
    matchesAnyPattern(file.basename, config.apps.allowedExceptions)
  ) {
    return 'composition-root';
  }
  return 'unknown';
}

export function expectedTierForShape(shape: FileShape): CladTierId | null {
  switch (shape) {
    case 'view-markup':
      return 'views';
    case 'organism-rune':
      return 'organisms';
    case 'recipe-orchestrator':
      return 'recipes';
    case 'composition-root':
      return 'apps';
    default:
      return null;
  }
}

export function extractFeatureSegment(relativePath: string, config: CladAuditConfig): string {
  const normalized = normalizeRelativePath(relativePath);
  const appsFolder = config.tiers.apps ?? 'apps';
  const prefix = `${normalizeRelativePath(config.srcRoot)}/${appsFolder}/`;
  if (!normalized.startsWith(prefix)) {
    const parts = normalized.split('/');
    const srcIdx = parts.indexOf(config.tiers[detectTierFromPath(normalized, config)] ?? '');
    if (srcIdx >= 0 && parts[srcIdx + 1]) return parts[srcIdx + 1];
    return 'shared';
  }
  const rest = normalized.slice(prefix.length);
  const segment = rest.split('/')[0];
  return segment && segment.length > 0 ? segment : 'shared';
}

function detectTierFromPath(normalized: string, config: CladAuditConfig): CladTierId {
  for (const [tier, folder] of Object.entries(config.tiers) as [CladTierId, string | undefined][]) {
    if (!folder) continue;
    const prefix = `${normalizeRelativePath(config.srcRoot)}/${folder}`;
    if (normalized.startsWith(`${prefix}/`)) return tier;
  }
  return 'unknown';
}

export function tierFolder(config: CladAuditConfig, tier: CladTierId): string {
  return `${normalizeRelativePath(config.srcRoot)}/${config.tiers[tier] ?? tier}`;
}

export function suggestTargetPath(
  file: ScannedFile,
  expectedTier: CladTierId,
  config: CladAuditConfig,
): string {
  const base = tierFolder(config, expectedTier);
  const feature = extractFeatureSegment(file.relativePath, config);

  if (expectedTier === 'views') {
    return `${base}/popouts/${feature}/${file.basename}`;
  }
  if (expectedTier === 'organisms') {
    return `${base}/${feature}/${file.basename}`;
  }
  if (expectedTier === 'recipes') {
    const sub = file.basename.startsWith('register') ? '' : `${feature}/`;
    return `${base}/${sub}${file.basename}`;
  }
  if (expectedTier === 'molecules') {
    return `${base}/${feature}/${file.basename}`;
  }
  return `${base}/${file.basename}`;
}
