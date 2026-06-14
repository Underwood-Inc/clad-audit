import type { CladFinding, ScannedFile } from '../motes/types.js';
import {
  firstMatchingLine,
  parseAllImports,
  parseSvelteImports,
  stripCommentsAndStrings,
} from './importAnalysis.js';

/** 1-based inclusive source range for IDE diagnostics. */
export type SourceRange = {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
};

export type FileAnchorKind = 'default' | 'svelte-markup' | 'svelte-props' | 'file-size';

export function rangeForWholeLine(content: string, line: number): SourceRange {
  const lines = content.split('\n');
  const text = lines[line - 1] ?? '';
  const trimmed = text.trimEnd();
  return {
    line,
    column: 1,
    endLine: line,
    endColumn: Math.max(1, trimmed.length + 1),
  };
}

/** Locate a substring on a specific 1-based line (first occurrence). */
export function rangeForSubstringOnLine(
  content: string,
  line: number,
  needle: string,
): SourceRange | undefined {
  const lines = content.split('\n');
  const text = lines[line - 1];
  if (text == null || !needle) return undefined;
  const idx = text.indexOf(needle);
  if (idx < 0) return rangeForWholeLine(content, line);
  return {
    line,
    column: idx + 1,
    endLine: line,
    endColumn: idx + 1 + needle.length,
  };
}

/** Narrow a diagnostic to the import specifier token on a line. */
export function rangeForImportSpecifier(
  content: string,
  line: number,
  specifier: string,
): SourceRange {
  const lines = content.split('\n');
  const text = lines[line - 1] ?? '';
  const quoted = [`'${specifier}'`, `"${specifier}"`];
  for (const token of quoted) {
    const idx = text.indexOf(token);
    if (idx >= 0) {
      return {
        line,
        column: idx + 2,
        endLine: line,
        endColumn: idx + 1 + token.length - 1,
      };
    }
  }
  const bare = text.indexOf(specifier);
  if (bare >= 0) {
    return {
      line,
      column: bare + 1,
      endLine: line,
      endColumn: bare + 1 + specifier.length,
    };
  }
  return rangeForWholeLine(content, line);
}

/** Map a regex match index in full file content to a source range. */
export function rangeForMatchIndex(content: string, index: number, length: number): SourceRange {
  const before = content.slice(0, index);
  const line = before.split('\n').length;
  const lastNl = before.lastIndexOf('\n');
  const column = index - lastNl;
  const matchText = content.slice(index, index + length);
  const endBefore = content.slice(0, index + length);
  const endLine = endBefore.split('\n').length;
  const endLastNl = endBefore.lastIndexOf('\n');
  const endColumn = index + length - endLastNl;
  return { line, column, endLine, endColumn };
}

export function findSvelteScriptOpenRange(content: string): SourceRange | undefined {
  const match = content.match(/<script(?:\s[^>]*)?>/i);
  if (!match || match.index == null) return undefined;
  return rangeForMatchIndex(content, match.index, match[0].length);
}

export function findSveltePropsRange(content: string): SourceRange | undefined {
  const match = content.match(/\{\s*[^}]+\s*\}\s*=\s*\$props\s*\(\s*\)/s);
  if (!match || match.index == null) return undefined;
  return rangeForMatchIndex(content, match.index, match[0].length);
}

export function findFirstImportRange(file: ScannedFile): SourceRange | undefined {
  const imports =
    file.extension === '.svelte' || file.basename.endsWith('.svelte')
      ? parseSvelteImports(file.content)
      : parseAllImports(file.content);
  const first = imports[0];
  if (!first) return undefined;
  return rangeForImportSpecifier(file.content, first.line, first.specifier);
}

export function anchorRangeForFile(file: ScannedFile, kind: FileAnchorKind = 'default'): SourceRange {
  if (kind === 'svelte-props') {
    const props = findSveltePropsRange(file.content);
    if (props) return props;
  }

  const importRange = findFirstImportRange(file);
  if (importRange) return importRange;

  if (kind === 'svelte-markup' || file.extension === '.svelte') {
    const script = findSvelteScriptOpenRange(file.content);
    if (script) return script;
    const markup = firstMatchingLine(file.content, (l) => l.trim().startsWith('<'));
    if (markup) return rangeForWholeLine(file.content, markup);
  }

  if (kind === 'file-size') {
    const limitLine = file.lineCount;
    return rangeForWholeLine(file.content, limitLine);
  }

  const firstCode = firstMatchingLine(
    file.content,
    (line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith('//') && !t.startsWith('/*') && !t.startsWith('*');
    },
  );
  if (firstCode) return rangeForWholeLine(file.content, firstCode);

  return rangeForWholeLine(file.content, 1);
}

export function anchorKindForRule(rule: string): FileAnchorKind {
  switch (rule) {
    case 'svelte-props-excess':
      return 'svelte-props';
    case 'view-in-app-tier':
      return 'svelte-markup';
    case 'file-size-tier':
      return 'file-size';
    default:
      return 'default';
  }
}

export function applySourceRange(finding: CladFinding, range: SourceRange): CladFinding {
  return {
    ...finding,
    line: range.line,
    column: range.column,
    endLine: range.endLine,
    endColumn: range.endColumn,
  };
}

/** Attach precise line/column ranges when missing or improvable. */
export function normalizeFindingLocation(finding: CladFinding, file: ScannedFile): CladFinding {
  if (finding.importSpecifier && finding.line) {
    return applySourceRange(
      finding,
      rangeForImportSpecifier(file.content, finding.line, finding.importSpecifier),
    );
  }

  if (finding.line && finding.column) {
    return finding;
  }

  if (finding.line && !finding.column) {
    const needle =
      finding.rule === 'tier-impurity'
        ? extractImpurityNeedle(finding.message)
        : undefined;
    if (needle) {
      const narrowed = rangeForSubstringOnLine(file.content, finding.line, needle);
      if (narrowed) return applySourceRange(finding, narrowed);
    }
    return applySourceRange(finding, rangeForWholeLine(file.content, finding.line));
  }

  return applySourceRange(finding, anchorRangeForFile(file, anchorKindForRule(finding.rule)));
}

function extractImpurityNeedle(message: string): string | undefined {
  const quoted = message.match(/"([^"]+)"/);
  return quoted?.[1];
}
