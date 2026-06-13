import type { AnalysisContext, AnalysisDepth, CladAuditConfig, ScannedFile } from '../motes/types.js';
import { depthAtLeast } from '../motes/types.js';
import { buildImportGraph } from '../plugs/node/importGraph.js';

export async function createAnalysisContext(
  rootDir: string,
  files: ScannedFile[],
  config: CladAuditConfig,
  depth: AnalysisDepth,
): Promise<AnalysisContext> {
  const fileByPath = new Map<string, ScannedFile>();
  for (const f of files) fileByPath.set(f.relativePath, f);

  let importEdges: AnalysisContext['importEdges'] = [];
  if (depthAtLeast(depth, 'standard')) {
    const useTsMorph =
      depthAtLeast(depth, 'deep') && config.analysis.useTsMorph;
    importEdges = buildImportGraph(rootDir, files, config, useTsMorph);
  }

  return {
    depth,
    importEdges,
    fileByPath,
  };
}
