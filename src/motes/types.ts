export type CladTierId =
  | 'atoms'
  | 'molecules'
  | 'organisms'
  | 'recipes'
  | 'views'
  | 'apps'
  | 'sockets'
  | 'plugs'
  | 'ui'
  | 'unknown';

export type CladSeverity = 'error' | 'warning' | 'info';

/** How thoroughly the auditor analyzes the codebase. */
export type AnalysisDepth = 'quick' | 'standard' | 'deep' | 'exhaustive';

export type RemediationAction =
  | 'move'
  | 'extract'
  | 'refactor'
  | 'configure'
  | 'split'
  | 'wrap'
  | 'delete'
  | 'document';

export type RemediationStep = {
  action: RemediationAction;
  summary: string;
  details?: string;
};

/** Scripted, deterministic fix plan (no LLM). */
export type RemediationPlan = {
  summary: string;
  steps: RemediationStep[];
  suggestedTargetPath?: string;
  /** Optional YAML snippet for `.clad-audit.yaml` when an exception is valid. */
  configExceptionYaml?: string;
};

export type CladFinding = {
  rule: string;
  severity: CladSeverity;
  message: string;
  advice: string;
  filePath: string;
  /** 1-based start line (inclusive). */
  line?: number;
  /** 1-based start column (inclusive). */
  column?: number;
  /** 1-based end line (inclusive). */
  endLine?: number;
  /** 1-based end column (exclusive in VS Code; inclusive here for auditor parity). */
  endColumn?: number;
  tier?: CladTierId;
  expectedTier?: CladTierId;
  /** Why this violates CLAD — audit trail for reviewers. */
  reasoning?: string[];
  /** Structured remediation beyond the one-line advice. */
  remediation?: RemediationPlan;
  importSpecifier?: string;
  relatedPaths?: string[];
  /** Minimum analysis depth that runs this rule (set by the auditor). */
  ruleMinDepth?: AnalysisDepth;
};

export type CladAuditResult = {
  ok: boolean;
  filesScanned: number;
  findings: CladFinding[];
  summaryByRule: Record<string, number>;
  summaryByTier: Partial<Record<CladTierId, number>>;
  analysisDepth: AnalysisDepth;
  durationMs: number;
  importEdgesAnalyzed?: number;
};

export type TierPathMap = Partial<Record<CladTierId, string>>;

export type CladAuditConfig = {
  srcRoot: string;
  tiers: TierPathMap;
  importAliases: Record<string, CladTierId>;
  ignoreGlobs: string[];
  scanGlobs: string[];
  analysis: {
    /** Default depth when CLI `--depth` is omitted. */
    defaultDepth: AnalysisDepth;
    /** Use ts-morph for TS/TSX when depth is `deep` or `exhaustive`. */
    useTsMorph: boolean;
    /** Max import-cycle path length reported (exhaustive). */
    maxCyclePathLength: number;
    /** Fan-in threshold for coupling hotspot info findings (exhaustive). */
    couplingHotspotThreshold: number;
  };
  apps: {
    allowedFilenamePatterns: string[];
    allowedExceptions: string[];
  };
  forbiddenInApps: {
    extensions: string[];
    filenamePatterns: string[];
  };
  views: {
    extensions: string[];
    extraViewPaths: string[];
  };
  organisms: {
    filenamePatterns: string[];
    allowedExceptions: string[];
  };
  recipes: {
    filenamePatterns: string[];
  };
  importBoundary: Partial<Record<CladTierId, CladTierId[]>>;
  tierImpurity: Partial<
    Record<
      CladTierId,
      {
        bannedImportSubstrings: string[];
        bannedContentPatterns: string[];
      }
    >
  >;
  canonAllowlist: {
    enabled: boolean;
    allowlistNamePattern: string;
    catalogFilenamePattern: string;
  };
  fileSize: Partial<
    Record<
      CladTierId,
      {
        maxLines: number;
        severity: CladSeverity;
      }
    >
  >;
  svelteProps: {
    enabled: boolean;
    maxProps: number;
    severity: CladSeverity;
  };
};

export type ScannedFile = {
  relativePath: string;
  absolutePath: string;
  tier: CladTierId;
  /** Primary extension, e.g. `.svelte`, `.ts`, `.svelte.ts` */
  extension: string;
  basename: string;
  lineCount: number;
  content: string;
};

export type ImportKind = 'static' | 'dynamic' | 'reexport' | 'require' | 'side-effect';

export type ParsedImport = {
  specifier: string;
  line: number;
  kind: ImportKind;
  isTypeOnly: boolean;
};

export type ImportGraphEdge = {
  fromPath: string;
  toPath: string | null;
  specifier: string;
  line: number;
  kind: ImportKind;
  fromTier: CladTierId;
  toTier: CladTierId | null;
};

export type AnalysisContext = {
  depth: AnalysisDepth;
  importEdges: ImportGraphEdge[];
  fileByPath: Map<string, ScannedFile>;
};

export type RuleContext = {
  rootDir: string;
  config: CladAuditConfig;
  files: ScannedFile[];
  analysis: AnalysisContext;
};

export type CladRule = {
  id: string;
  description: string;
  defaultAdvice: string;
  /** Minimum analysis depth to run this rule. */
  minDepth: AnalysisDepth;
  run: (ctx: RuleContext) => CladFinding[];
};

export const ExitCode = {
  Ok: 0,
  AuditFailed: 1,
  ConfigInvalid: 2,
  IoError: 3,
} as const;

export const DEPTH_ORDER: AnalysisDepth[] = ['quick', 'standard', 'deep', 'exhaustive'];

export function depthAtLeast(current: AnalysisDepth, required: AnalysisDepth): boolean {
  return DEPTH_ORDER.indexOf(current) >= DEPTH_ORDER.indexOf(required);
}
