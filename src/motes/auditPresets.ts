import { ALL_CLAD_RULES } from '../rules/index.js';

export type AuditPresetId =
  | 'apps'
  | 'imports'
  | 'structure'
  | 'quality'
  | 'standard'
  | 'full'
  | 'exhaustive';

export type AnalysisDepth = import('./types.js').AnalysisDepth;

export type CladTierFocus =
  | 'all'
  | 'apps'
  | 'views'
  | 'organisms'
  | 'recipes'
  | 'molecules'
  | 'atoms';

export type AuditPreset = {
  id: AuditPresetId;
  label: string;
  description: string;
  rules: string[] | 'all';
  suggestStrict?: boolean;
  /** Suggested analysis depth when using this preset without --depth. */
  suggestDepth?: AnalysisDepth;
};

const APP_RULES = [
  'app-tier-allowlist',
  'view-in-app-tier',
  'organism-in-app-tier',
  'recipe-in-app-tier',
] as const;

const IMPORT_RULES = ['import-boundary', 'tier-impurity'] as const;

const QUALITY_RULES = [
  'canon-parallel-allowlist',
  'file-size-tier',
  'svelte-props-excess',
] as const;

export const AUDIT_PRESETS: AuditPreset[] = [
  {
    id: 'apps',
    label: 'Apps tier',
    description: 'Composition-root hygiene — what belongs in apps/ vs lower tiers.',
    rules: [...APP_RULES],
  },
  {
    id: 'imports',
    label: 'Import boundaries',
    description: 'Inward dependency matrix and tier impurity (framework leakage).',
    rules: [...IMPORT_RULES],
  },
  {
    id: 'structure',
    label: 'Structure',
    description: 'Apps tier + import boundaries — the core CLAD layout pass.',
    rules: [...APP_RULES, ...IMPORT_RULES],
  },
  {
    id: 'quality',
    label: 'Quality signals',
    description: 'Canon allowlists, oversized files, and optional Svelte prop counts.',
    rules: [...QUALITY_RULES],
    suggestStrict: false,
  },
  {
    id: 'standard',
    label: 'Standard',
    description: 'Structure rules (errors). Skips optional quality warnings.',
    rules: [...APP_RULES, ...IMPORT_RULES],
  },
  {
    id: 'full',
    label: 'Full audit',
    description: 'Every built-in rule including quality warnings (standard depth).',
    rules: 'all',
    suggestStrict: false,
    suggestDepth: 'standard',
  },
  {
    id: 'exhaustive',
    label: 'Exhaustive',
    description: 'All rules at maximum depth — import cycles, hotspots, ts-morph graph.',
    rules: 'all',
    suggestStrict: false,
    suggestDepth: 'exhaustive',
  },
];

export function presetById(id: AuditPresetId): AuditPreset {
  const preset = AUDIT_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown audit preset: ${id}`);
  return preset;
}

export function resolvePresetRules(preset: AuditPreset): string[] {
  if (preset.rules === 'all') {
    return ALL_CLAD_RULES.map((r) => r.id);
  }
  return [...preset.rules];
}

export function isValidPresetId(value: string): value is AuditPresetId {
  return AUDIT_PRESETS.some((p) => p.id === value);
}

/** Filter findings when the user focuses on a single CLAD tier. */
export function filterFindingsByTierFocus<T extends { tier?: string; filePath: string }>(
  findings: T[],
  focus: CladTierFocus,
  tierPathPrefixes: Partial<Record<string, string>>,
): T[] {
  if (focus === 'all') return findings;
  const prefix = tierPathPrefixes[focus];
  return findings.filter((f) => {
    if (f.tier === focus) return true;
    if (prefix && f.filePath.replace(/\\/g, '/').includes(`/${prefix.replace(/\\/g, '/')}/`)) {
      return true;
    }
    if (prefix && f.filePath.replace(/\\/g, '/').startsWith(`${prefix.replace(/\\/g, '/')}/`)) {
      return true;
    }
    return false;
  });
}
