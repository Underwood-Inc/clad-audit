import { resolve } from 'node:path';
import { Project, SyntaxKind } from 'ts-morph';
import type { CladAuditConfig, ImportGraphEdge, ImportKind, ScannedFile } from '../../motes/types.js';
import {
  parseAllImports,
  parseSvelteImports,
  primaryExtension,
} from '../../sparks/importAnalysis.js';
import { normalizeRelativePath, resolveImportTier, tierForRelativePath } from '../../sparks/pathTier.js';

const TS_LIKE = /\.(tsx?|[mc]ts)$/i;

function resolveEdge(
  fromFile: ScannedFile,
  specifier: string,
  line: number,
  kind: ImportKind,
  config: CladAuditConfig,
): ImportGraphEdge {
  const toTier = resolveImportTier(specifier, fromFile.relativePath, config);
  let toPath: string | null = null;
  if (specifier.startsWith('.')) {
    const normalizedFrom = normalizeRelativePath(fromFile.relativePath);
    const fromDir = normalizedFrom.split('/').slice(0, -1);
    const parts = [...fromDir, ...specifier.split('/')];
    const stack: string[] = [];
    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    toPath = stack.join('/');
  } else if (!specifier.includes(':')) {
    const srcPrefix = normalizeRelativePath(config.srcRoot);
    toPath = `${srcPrefix}/${specifier}`.replace(/\/+/g, '/');
  }

  return {
    fromPath: fromFile.relativePath,
    toPath,
    specifier,
    line,
    kind,
    fromTier: fromFile.tier,
    toTier,
  };
}

function importsForFile(file: ScannedFile): ReturnType<typeof parseAllImports> {
  if (file.extension === '.svelte' || file.basename.endsWith('.svelte')) {
    return parseSvelteImports(file.content);
  }
  return parseAllImports(file.content);
}

/** Regex-based import graph — always built for standard+ depth. */
export function buildRegexImportGraph(
  files: ScannedFile[],
  config: CladAuditConfig,
): ImportGraphEdge[] {
  const edges: ImportGraphEdge[] = [];
  for (const file of files) {
    for (const imp of importsForFile(file)) {
      edges.push(resolveEdge(file, imp.specifier, imp.line, imp.kind, config));
    }
  }
  return edges;
}

/** ts-morph import graph — merges with regex edges for TS/TSX (deep+). */
export function buildTsMorphImportGraph(
  rootDir: string,
  files: ScannedFile[],
  config: CladAuditConfig,
): ImportGraphEdge[] {
  const tsFiles = files.filter((f) => TS_LIKE.test(f.basename));
  if (tsFiles.length === 0) return [];

  const project = new Project({
    compilerOptions: { allowJs: true, jsx: 1 },
    skipAddingFilesFromTsConfig: true,
  });

  for (const file of tsFiles) {
    project.addSourceFileAtPath(resolve(rootDir, file.relativePath));
  }

  const edges: ImportGraphEdge[] = [];
  const seen = new Set<string>();

  for (const sf of project.getSourceFiles()) {
    const rel = normalizeRelativePath(
      sf.getFilePath().replace(/\\/g, '/').slice(rootDir.replace(/\\/g, '/').length + 1),
    );
    const fromFile = files.find((f) => f.relativePath === rel);
    if (!fromFile) continue;

    const add = (specifier: string, line: number, kind: ImportKind) => {
      const key = `${rel}|${line}|${specifier}|${kind}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(resolveEdge(fromFile, specifier, line, kind, config));
    };

    for (const decl of sf.getImportDeclarations()) {
      const spec = decl.getModuleSpecifierValue();
      add(spec, decl.getStartLineNumber(), 'static');
    }

    for (const decl of sf.getExportDeclarations()) {
      const spec = decl.getModuleSpecifierValue();
      if (spec) add(spec, decl.getStartLineNumber(), 'reexport');
    }

    sf.forEachDescendant((node) => {
      if (node.getKind() === SyntaxKind.CallExpression) {
        const call = node.asKind(SyntaxKind.CallExpression);
        const expr = call?.getExpression().getText();
        if (expr === 'require') {
          const arg = call?.getArguments()[0];
          if (call && arg && arg.getKind() === SyntaxKind.StringLiteral) {
            add(arg.getText().slice(1, -1), call.getStartLineNumber(), 'require');
          }
        }
      }
      if (node.getKind() === SyntaxKind.ImportKeyword) {
        const parent = node.getParentIfKind(SyntaxKind.CallExpression);
        if (!parent) return;
        const arg = parent.getArguments()[0];
        if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
          add(arg.getText().slice(1, -1), parent.getStartLineNumber(), 'dynamic');
        }
      }
    });
  }

  return edges;
}

export function mergeImportEdges(primary: ImportGraphEdge[], secondary: ImportGraphEdge[]): ImportGraphEdge[] {
  const map = new Map<string, ImportGraphEdge>();
  for (const e of [...primary, ...secondary]) {
    map.set(`${e.fromPath}|${e.line}|${e.specifier}|${e.kind}`, e);
  }
  return [...map.values()];
}

export function buildImportGraph(
  rootDir: string,
  files: ScannedFile[],
  config: CladAuditConfig,
  useTsMorph: boolean,
): ImportGraphEdge[] {
  const regex = buildRegexImportGraph(files, config);
  if (!useTsMorph) return regex;
  const morph = buildTsMorphImportGraph(rootDir, files, config);
  return mergeImportEdges(regex, morph);
}

/** Find simple cycles in import graph (same-tier or cross-tier). */
export function findImportCycles(
  edges: ImportGraphEdge[],
  maxPathLength: number,
): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!e.toPath) continue;
    if (!adj.has(e.fromPath)) adj.set(e.fromPath, new Set());
    adj.get(e.fromPath)!.add(e.toPath);
  }

  const cycles: string[][] = [];
  const seenCycleKeys = new Set<string>();

  function dfs(path: string[], visited: Set<string>) {
    if (path.length > maxPathLength) return;
    const node = path[path.length - 1];
    const nexts = adj.get(node);
    if (!nexts) return;

    for (const next of nexts) {
      const idx = path.indexOf(next);
      if (idx >= 0) {
        const cycle = path.slice(idx).concat(next);
        const key = cycle.sort().join('→');
        if (!seenCycleKeys.has(key)) {
          seenCycleKeys.add(key);
          cycles.push(cycle);
        }
        continue;
      }
      if (visited.has(next)) continue;
      visited.add(next);
      dfs([...path, next], visited);
      visited.delete(next);
    }
  }

  for (const start of adj.keys()) {
    dfs([start], new Set([start]));
  }

  return cycles;
}

export function fanInByPath(edges: ImportGraphEdge[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of edges) {
    if (!e.toPath) continue;
    counts.set(e.toPath, (counts.get(e.toPath) ?? 0) + 1);
  }
  return counts;
}

export { primaryExtension, tierForRelativePath };
