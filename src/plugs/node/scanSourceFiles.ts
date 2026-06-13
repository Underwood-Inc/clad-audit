import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import fg from 'fast-glob';
import type { CladAuditConfig, ScannedFile } from '../../motes/types.js';
import { countLines, isIgnored, tierForRelativePath } from '../../sparks/pathTier.js';
import { primaryExtension } from '../../sparks/importAnalysis.js';

export async function scanSourceFiles(rootDir: string, config: CladAuditConfig): Promise<ScannedFile[]> {
  const srcAbs = resolve(rootDir, config.srcRoot);
  const patterns = config.scanGlobs.map((g) => `${config.srcRoot}/${g}`.replace(/\\/g, '/'));
  const paths = await fg(patterns, {
    cwd: rootDir,
    absolute: true,
    onlyFiles: true,
    dot: false,
  });

  const files: ScannedFile[] = [];
  for (const absolutePath of paths) {
    const relativePath = relative(rootDir, absolutePath).replace(/\\/g, '/');
    if (isIgnored(relativePath, config.ignoreGlobs)) continue;
    const content = readFileSync(absolutePath, 'utf8');
    const basename = relativePath.split('/').pop() ?? relativePath;
    const extension = primaryExtension(basename);
    files.push({
      relativePath,
      absolutePath,
      tier: tierForRelativePath(relativePath, config),
      extension,
      basename,
      lineCount: countLines(content),
      content,
    });
  }

  // Ensure src root exists conceptually even when empty
  void srcAbs;
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}
