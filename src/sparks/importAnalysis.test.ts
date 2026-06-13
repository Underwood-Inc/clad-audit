import { describe, expect, test } from 'vitest';
import {
  parseAllImports,
  parseSvelteImports,
  primaryExtension,
  stripCommentsAndStrings,
} from './importAnalysis.js';

describe('importAnalysis', () => {
  test('[FR-002] parseAllImports finds static, dynamic, require, reexport', () => {
    const src = `
import { a } from './a.js';
export { b } from '../recipes/b.js';
const x = await import('./lazy.js');
require('node:fs');
`;
    const imports = parseAllImports(src);
    expect(imports.some((i) => i.kind === 'static' && i.specifier === './a.js')).toBe(true);
    expect(imports.some((i) => i.kind === 'reexport')).toBe(true);
    expect(imports.some((i) => i.kind === 'dynamic')).toBe(true);
    expect(imports.some((i) => i.kind === 'require')).toBe(true);
  });

  test('[FR-002] stripCommentsAndStrings removes string matches', () => {
    const stripped = stripCommentsAndStrings(`// $state\nconst t = '$state'`);
    expect(stripped.includes('$state')).toBe(false);
  });

  test('[FR-002] primaryExtension handles compound extensions', () => {
    expect(primaryExtension('foo.svelte.ts')).toBe('.svelte.ts');
    expect(primaryExtension('Panel.svelte')).toBe('.svelte');
  });

  test('[FR-002] parseSvelteImports reads script blocks', () => {
    const src = `<script>
  import Foo from './Foo.svelte';
</script>
<div></div>`;
    expect(parseSvelteImports(src).some((i) => i.specifier === './Foo.svelte')).toBe(true);
  });
});
