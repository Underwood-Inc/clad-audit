import type { ParsedImport } from '../motes/types.js';

/** Strip line and block comments plus string literals for impurity scans. */
export function stripCommentsAndStrings(source: string): string {
  let out = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      i += 2;
      while (i < len && source[i] !== '\n') i++;
      out += ' ';
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < len - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    if (ch === '`') {
      i++;
      while (i < len && source[i] !== '`') {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      out += ' ';
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      while (i < len && source[i] !== quote) {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      out += ' ';
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

const STATIC_IMPORT =
  /^\s*import\s+(type\s+)?(?:[\w*{}\s,$]+)\s+from\s+['"]([^'"]+)['"]/;
const SIDE_EFFECT_IMPORT = /^\s*import\s+['"]([^'"]+)['"]/;
const EXPORT_FROM = /^\s*export\s+(type\s+)?(?:[\w*{}\s,$]+)\s+from\s+['"]([^'"]+)['"]/;
const DYNAMIC_IMPORT = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const REQUIRE_CALL = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Parse imports from a TypeScript/JavaScript module (regex-based, depth standard+). */
export function parseAllImports(source: string): ParsedImport[] {
  const out: ParsedImport[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m = line.match(STATIC_IMPORT);
    if (m?.[2]) {
      out.push({
        specifier: m[2],
        line: i + 1,
        kind: 'static',
        isTypeOnly: Boolean(m[1]),
      });
      continue;
    }
    m = line.match(SIDE_EFFECT_IMPORT);
    if (m?.[1]) {
      out.push({ specifier: m[1], line: i + 1, kind: 'side-effect', isTypeOnly: false });
      continue;
    }
    m = line.match(EXPORT_FROM);
    if (m?.[2]) {
      out.push({
        specifier: m[2],
        line: i + 1,
        kind: 'reexport',
        isTypeOnly: Boolean(m[1]),
      });
    }
  }

  for (const m of source.matchAll(DYNAMIC_IMPORT)) {
    if (m[1]) {
      const line = lineNumberAt(source, m.index ?? 0);
      out.push({ specifier: m[1], line, kind: 'dynamic', isTypeOnly: false });
    }
  }

  for (const m of source.matchAll(REQUIRE_CALL)) {
    if (m[1]) {
      const line = lineNumberAt(source, m.index ?? 0);
      out.push({ specifier: m[1], line, kind: 'require', isTypeOnly: false });
    }
  }

  return out;
}

/** Extract concatenated script blocks from Svelte SFCs. */
export function extractSvelteScriptBlocks(content: string): string[] {
  const blocks: string[] = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  for (const m of content.matchAll(re)) {
    if (m[1]) blocks.push(m[1]);
  }
  return blocks;
}

/** Imports from .svelte files with 1-based line numbers in the SFC source. */
export function parseSvelteImports(content: string): ParsedImport[] {
  const out: ParsedImport[] = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  for (const m of content.matchAll(re)) {
    const body = m[1];
    if (!body) continue;
    const bodyOffset = (m.index ?? 0) + m[0].indexOf(body);
    const bodyStartLine = content.slice(0, bodyOffset).split('\n').length;
    for (const imp of parseAllImports(body)) {
      out.push({ ...imp, line: bodyStartLine + imp.line - 1 });
    }
  }
  return out;
}

function lineNumberAt(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/** Resolve file extension from basename (handles `.svelte.ts`, `.test.ts`). */
export function primaryExtension(basename: string): string {
  if (basename.endsWith('.svelte.ts')) return '.svelte.ts';
  if (basename.endsWith('.svelte.js')) return '.svelte.js';
  if (basename.endsWith('.test.ts')) return '.test.ts';
  if (basename.endsWith('.test.tsx')) return '.test.tsx';
  if (basename.endsWith('.spec.ts')) return '.spec.ts';
  const dot = basename.lastIndexOf('.');
  if (dot <= 0) return '';
  return basename.slice(dot);
}

/** Back-compat alias used by pathTier. */
export function parseStaticImports(source: string): { specifier: string; line: number }[] {
  return parseAllImports(source)
    .filter((i) => i.kind === 'static')
    .map(({ specifier, line }) => ({ specifier, line }));
}

export function firstMatchingLine(
  content: string,
  pred: (line: string) => boolean,
  useStripped = false,
): number | undefined {
  const text = useStripped ? stripCommentsAndStrings(content) : content;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pred(lines[i])) return i + 1;
  }
  return undefined;
}
