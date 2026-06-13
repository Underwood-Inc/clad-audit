import { describe, expect, test } from 'vitest';
import { loadRequirementsRegistrySync } from '@underwoodinc/requirements-tracer/load-registry';
import { resolve } from 'node:path';

describe('traceability', () => {
  test('[META-001] requirements registry loads FR, NFR, and META kinds', () => {
    const registry = loadRequirementsRegistrySync({
      rootDir: process.cwd(),
      registryPath: resolve(process.cwd(), 'requirements-registry.yaml'),
    });
    const reqs = Object.values(registry.requirements);
    expect(reqs.some((r) => r.kind === 'FR')).toBe(true);
    expect(reqs.some((r) => r.kind === 'NFR')).toBe(true);
    expect(reqs.some((r) => r.kind === 'META')).toBe(true);
  });
});
