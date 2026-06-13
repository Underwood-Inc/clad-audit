import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { defaultCladAuditConfig } from './defaultConfig.js';
import type { CladAuditConfig } from './types.js';

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof out[key] === 'object') {
      out[key] = deepMerge(out[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out as T;
}

export function mergeCladAuditConfig(patch: Partial<CladAuditConfig>): CladAuditConfig {
  return deepMerge(defaultCladAuditConfig() as unknown as Record<string, unknown>, patch as Record<string, unknown>) as unknown as CladAuditConfig;
}

export function loadCladAuditConfig(configPath: string | undefined): CladAuditConfig {
  const base = defaultCladAuditConfig();
  if (!configPath || !existsSync(configPath)) return base;
  const raw = readFileSync(configPath, 'utf8');
  const parsed = parseYaml(raw) as Partial<CladAuditConfig> | null;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid CLAD audit config at ${configPath}`);
  }
  return mergeCladAuditConfig(parsed);
}
