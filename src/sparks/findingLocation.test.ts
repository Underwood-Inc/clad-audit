import { describe, expect, test } from 'vitest';
import type { ScannedFile } from '../motes/types.js';
import {
  anchorRangeForFile,
  findSveltePropsRange,
  normalizeFindingLocation,
  rangeForImportSpecifier,
  rangeForMatchIndex,
} from './findingLocation.js';

function scanned(partial: Partial<ScannedFile> & Pick<ScannedFile, 'relativePath'>): ScannedFile {
  const basename = partial.basename ?? partial.relativePath.split('/').pop() ?? partial.relativePath;
  const content = partial.content ?? '';
  return {
    absolutePath: `/proj/${partial.relativePath}`,
    basename,
    extension: partial.extension ?? '.ts',
    lineCount: partial.lineCount ?? content.split('\n').length,
    tier: partial.tier ?? 'molecules',
    content,
    ...partial,
  };
}

describe('findingLocation', () => {
  test('[FR-002] rangeForImportSpecifier highlights quoted module path', () => {
    const content = "import type { X } from '$apps/bootstrapShell.js';";
    const range = rangeForImportSpecifier(content, 1, '$apps/bootstrapShell.js');
    expect(range.column).toBeGreaterThan(1);
    expect(content.slice(range.column - 1, range.endColumn - 1)).toBe('$apps/bootstrapShell.js');
  });

  test('[FR-002] anchorRangeForFile prefers first import over line 1', () => {
    const file = scanned({
      relativePath: 'src/apps/foo.ts',
      tier: 'apps',
      content: '// header\n\nimport { x } from "./x.js";\n',
    });
    const range = anchorRangeForFile(file);
    expect(range.line).toBe(3);
    expect(range.column).toBeGreaterThan(1);
  });

  test('[FR-002] findSveltePropsRange locates $props destructuring', () => {
    const content = '<script>\n  let { a, b, c, d, e } = $props();\n</script>\n';
    const range = findSveltePropsRange(content);
    expect(range?.line).toBe(2);
    expect(range?.column).toBeGreaterThan(1);
  });

  test('[FR-002] normalizeFindingLocation anchors file-tier findings', () => {
    const file = scanned({
      relativePath: 'src/apps/BadPanel.svelte',
      extension: '.svelte',
      tier: 'apps',
      content: '<script lang="ts">\nimport Foo from "./Foo.svelte";\n</script>\n<div></div>',
    });
    const normalized = normalizeFindingLocation(
      {
        rule: 'view-in-app-tier',
        severity: 'error',
        message: 'x',
        advice: 'y',
        filePath: file.relativePath,
      },
      file,
    );
    expect(normalized.line).toBe(2);
    expect(normalized.column).toBeDefined();
  });

  test('[FR-002] rangeForMatchIndex maps regex index to line/column', () => {
    const content = 'line1\nconst ALLOWLIST = [];\n';
    const idx = content.indexOf('ALLOWLIST');
    const range = rangeForMatchIndex(content, idx, 'ALLOWLIST'.length);
    expect(range.line).toBe(2);
    expect(range.column).toBe(7);
  });
});

describe('parseSvelteImports line mapping', () => {
  test('[FR-002] svelte import line is in SFC coordinates', async () => {
    const { parseSvelteImports } = await import('./importAnalysis.js');
    const src = `<div></div>
<script>
  import Foo from './Foo.svelte';
</script>`;
    const imports = parseSvelteImports(src);
    expect(imports[0]?.line).toBe(3);
  });
});
