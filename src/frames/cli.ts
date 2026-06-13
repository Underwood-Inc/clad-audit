#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { isValidPresetId, presetById, resolvePresetRules } from '../motes/auditPresets.js';
import { ExitCode, type AnalysisDepth } from '../motes/types.js';
import { ruleCatalog } from '../rules/index.js';
import { resolveColorEnabled } from '../sparks/terminalStyle.js';
import { formatMarkdownReport } from './markdownReport.js';
import { formatRulesCatalog, printAuditReport } from './printAuditReport.js';
import { runAudit } from './runAudit.js';
import { runCladAuditWizard } from './wizard.js';

const DEPTH_VALUES = ['quick', 'standard', 'deep', 'exhaustive'] as const;

function isAnalysisDepth(v: string): v is AnalysisDepth {
  return (DEPTH_VALUES as readonly string[]).includes(v);
}

const program = new Command();
program
  .name('clad-audit')
  .description('Agnostic CLAD tier and import-boundary auditor with scripted remediation.')
  .version('0.4.0');

program
  .command('audit')
  .description('Scan a codebase for CLAD tier violations. Exit non-zero on errors.')
  .option('--root <path>', 'project root', process.cwd())
  .option('--config <path>', 'path to .clad-audit.yaml', '.clad-audit.yaml')
  .option('--json', 'emit machine-readable JSON on stdout', false)
  .option('--rules <ids>', 'comma-separated rule ids to run (default: by depth)', '')
  .option(
    '--preset <id>',
    'preset: apps, imports, structure, quality, standard, full, exhaustive',
  )
  .option(
    '--depth <level>',
    'analysis depth: quick, standard, deep, exhaustive (default: config or standard)',
  )
  .option('--strict', 'treat warnings as errors', false)
  .option('--verbose', 'print reasoning and remediation steps', false)
  .option('--color', 'force colorized output')
  .option('--no-color', 'disable colorized output')
  .option('--limit <n>', 'max findings to print in human mode', '0')
  .option('--report <path>', 'write markdown report to file')
  .action(async (opts) => {
    const rootDir = resolve(opts.root);
    const colorEnabled = resolveColorEnabled(
      opts.color === true ? true : opts.color === false ? false : undefined,
    );

    try {
      const explicitRules = String(opts.rules ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      let ruleIds: string[] | undefined = explicitRules.length ? explicitRules : undefined;
      let presetLabel: string | undefined;
      let depth: AnalysisDepth | undefined;

      if (opts.depth) {
        if (!isAnalysisDepth(opts.depth)) {
          console.error(`Unknown depth "${opts.depth}". Valid: ${DEPTH_VALUES.join(', ')}`);
          process.exit(ExitCode.ConfigInvalid);
        }
        depth = opts.depth;
      }

      if (opts.preset) {
        if (!isValidPresetId(opts.preset)) {
          console.error(
            `Unknown preset "${opts.preset}". Valid: apps, imports, structure, quality, standard, full, exhaustive`,
          );
          process.exit(ExitCode.ConfigInvalid);
        }
        const preset = presetById(opts.preset);
        if (!ruleIds) ruleIds = resolvePresetRules(preset);
        presetLabel = preset.label;
        if (!depth && preset.suggestDepth) depth = preset.suggestDepth;
      }

      const { result, failed, rulesRun } = await runAudit({
        rootDir,
        configPath: opts.config,
        rules: ruleIds,
        strict: opts.strict === true,
        depth,
      });

      if (opts.report) {
        writeFileSync(
          resolve(opts.report),
          formatMarkdownReport(result, { preset: presetLabel, root: rootDir }),
          'utf8',
        );
      }

      if (opts.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        const limit = Number(opts.limit);
        printAuditReport(result, {
          strict: opts.strict === true,
          colorEnabled,
          verbose: opts.verbose === true,
          rulesRun: rulesRun.length ? [...new Set(rulesRun)] : undefined,
          presetLabel,
          findingLimit: limit > 0 ? limit : undefined,
        });
      }

      process.exit(failed ? ExitCode.AuditFailed : ExitCode.Ok);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(ExitCode.ConfigInvalid);
    }
  });

program
  .command('wizard')
  .description('Interactive audit wizard — pick tier preset, depth, rules, and focus (TTY required).')
  .option('--root <path>', 'default project root', process.cwd())
  .option('--color', 'force colorized output')
  .option('--no-color', 'disable colorized output')
  .action(async (opts) => {
    try {
      const colorEnabled = resolveColorEnabled(
        opts.color === true ? true : opts.color === false ? false : undefined,
      );
      await runCladAuditWizard({ defaultRoot: opts.root, colorEnabled });
      process.exit(process.exitCode ?? ExitCode.Ok);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(ExitCode.ConfigInvalid);
    }
  });

program
  .command('rules')
  .description('List built-in rules and default remediation advice.')
  .option('--color', 'force colorized output')
  .option('--no-color', 'disable colorized output')
  .action((opts) => {
    const colorEnabled = resolveColorEnabled(
      opts.color === true ? true : opts.color === false ? false : undefined,
    );
    process.stdout.write(formatRulesCatalog(ruleCatalog(), colorEnabled));
    process.stdout.write('\n');
    process.exit(ExitCode.Ok);
  });

program
  .command('presets')
  .description('List audit tier presets for --preset or the wizard.')
  .option('--color', 'force colorized output')
  .option('--no-color', 'disable colorized output')
  .action(async (opts) => {
    const { AUDIT_PRESETS } = await import('../motes/auditPresets.js');
    const { createStyle, resolveColorEnabled } = await import('../sparks/terminalStyle.js');
    const colorEnabled = resolveColorEnabled(
      opts.color === true ? true : opts.color === false ? false : undefined,
    );
    const style = createStyle(colorEnabled);
    process.stdout.write(`${style.header('CLAD audit presets')}\n\n`);
    for (const p of AUDIT_PRESETS) {
      const ruleList = p.rules === 'all' ? 'all rules' : p.rules.join(', ');
      process.stdout.write(`${style.accent(p.id)} — ${style.bold(p.label)}\n`);
      process.stdout.write(`  ${p.description}\n`);
      process.stdout.write(`  ${style.dim('Rules:')} ${ruleList}`);
      if (p.suggestDepth) process.stdout.write(` ${style.dim(`· depth ${p.suggestDepth}`)}`);
      process.stdout.write('\n\n');
    }
    process.exit(ExitCode.Ok);
  });

await program.parseAsync(process.argv);
