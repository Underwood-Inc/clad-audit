import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkbox, confirm, input, select } from '@inquirer/prompts';
import {
  AUDIT_PRESETS,
  presetById,
  resolvePresetRules,
  type AuditPresetId,
  type CladTierFocus,
} from '../motes/auditPresets.js';
import type { AnalysisDepth } from '../motes/types.js';
import { ruleCatalog } from '../rules/index.js';
import { createStyle, resolveColorEnabled } from '../sparks/terminalStyle.js';
import { formatAuditReport } from './printAuditReport.js';
import { runAudit } from './runAudit.js';

export type WizardOptions = {
  /** Initial root directory (defaults to cwd). */
  defaultRoot?: string;
  colorEnabled?: boolean;
};

export type WizardResult = {
  rootDir: string;
  configPath: string;
  presetId: AuditPresetId | 'custom';
  rules: string[];
  strict: boolean;
  tierFocus: CladTierFocus;
  depth: AnalysisDepth;
  emitJson: boolean;
  verbose: boolean;
};

function assertInteractive(): void {
  if (!process.stdin.isTTY) {
    throw new Error(
      'Interactive wizard requires a TTY. Use `clad-audit audit --preset <id>` in CI or pipes.',
    );
  }
}

/** Interactive CLAD audit wizard (Node.js — works on PowerShell, Linux, macOS). */
export async function runCladAuditWizard(options: WizardOptions = {}): Promise<WizardResult> {
  assertInteractive();
  const colorEnabled = resolveColorEnabled(options.colorEnabled);
  const style = createStyle(colorEnabled);

  process.stdout.write('\n');
  process.stdout.write(style.header('CLAD audit wizard'));
  process.stdout.write('\n');
  process.stdout.write(
    style.dim('Composable Layered Agnostic Design — tier placement and import boundaries.\n\n'),
  );

  const rootDir = await input({
    message: 'Project root to audit',
    default: options.defaultRoot ?? process.cwd(),
    validate: (value) => {
      const p = resolve(value);
      if (!existsSync(p)) return `Path does not exist: ${p}`;
      return true;
    },
  });

  const resolvedRoot = resolve(rootDir);
  const defaultConfig = existsSync(resolve(resolvedRoot, '.clad-audit.yaml'))
    ? '.clad-audit.yaml'
    : '.clad-audit.yaml';

  const configPath = await input({
    message: 'Config file (relative to project root)',
    default: defaultConfig,
  });

  const presetChoice = await select({
    message: 'Audit tier',
    choices: [
      ...AUDIT_PRESETS.map((p) => ({
        name: `${p.label} — ${p.description}`,
        value: p.id as AuditPresetId,
        description: p.rules === 'all' ? 'All rules' : p.rules.join(', '),
      })),
      {
        name: 'Custom — pick individual rules',
        value: 'custom' as const,
        description: 'Choose from the full rule catalog',
      },
    ],
  });

  let rules: string[];
  let presetId: AuditPresetId | 'custom';

  if (presetChoice === 'custom') {
    presetId = 'custom';
    const catalog = ruleCatalog();
    rules = await checkbox({
      message: 'Rules to run',
      choices: catalog.map((r) => ({
        name: `${r.id} — ${r.description}`,
        value: r.id,
        checked: [
          'app-tier-allowlist',
          'view-in-app-tier',
          'import-boundary',
          'tier-impurity',
        ].includes(r.id),
      })),
      validate: (selected) => (selected.length > 0 ? true : 'Select at least one rule'),
    });
  } else {
    presetId = presetChoice;
    rules = resolvePresetRules(presetById(presetChoice));
  }

  const preset = presetId !== 'custom' ? presetById(presetId) : undefined;

  const depth = await select({
    message: 'Analysis depth',
    choices: [
      { name: 'quick — core rules, fastest', value: 'quick' as const },
      { name: 'standard — comment-aware + misplaced tier + dynamic imports (recommended)', value: 'standard' as const },
      { name: 'deep — ts-morph graph + re-export barrels', value: 'deep' as const },
      { name: 'exhaustive — cycles, coupling hotspots, all signals', value: 'exhaustive' as const },
    ],
    default: preset?.suggestDepth ?? 'standard',
  });

  const tierFocus = await select({
    message: 'Focus findings on CLAD tier (optional filter)',
    choices: [
      { name: 'All tiers', value: 'all' as const },
      { name: 'apps', value: 'apps' as const },
      { name: 'views', value: 'views' as const },
      { name: 'organisms', value: 'organisms' as const },
      { name: 'recipes', value: 'recipes' as const },
      { name: 'molecules', value: 'molecules' as const },
      { name: 'atoms', value: 'atoms' as const },
    ],
  });

  const strict = await confirm({
    message: 'Strict mode (treat warnings as errors)?',
    default: preset?.suggestStrict ?? false,
  });

  const emitJson = await confirm({
    message: 'Emit JSON on stdout (for piping to a file)?',
    default: false,
  });

  const verbose = await confirm({
    message: 'Verbose output (reasoning + remediation steps)?',
    default: true,
  });

  const runNow = await confirm({
    message: style.success('Run audit now?'),
    default: true,
  });

  const result: WizardResult = {
    rootDir: resolvedRoot,
    configPath,
    presetId,
    rules,
    strict,
    tierFocus,
    depth,
    emitJson,
    verbose,
  };

  if (!runNow) {
    process.stdout.write(style.dim('\nWizard complete — no audit run.\n'));
    return result;
  }

  process.stdout.write(style.dim('\nRunning audit…\n'));

  const { result: auditResult, failed, rulesRun } = await runAudit({
    rootDir: resolvedRoot,
    configPath,
    rules,
    strict,
    tierFocus,
    depth,
  });

  if (emitJson) {
    process.stdout.write(`${JSON.stringify(auditResult, null, 2)}\n`);
  } else {
    const presetLabel =
      presetId === 'custom' ? 'Custom' : presetById(presetId).label;
    process.stdout.write(
      formatAuditReport(auditResult, {
        strict,
        colorEnabled,
        verbose,
        rulesRun,
        presetLabel,
        findingLimit: 50,
      }),
    );
  }

  if (failed) {
    process.exitCode = 1;
  }

  return result;
}
