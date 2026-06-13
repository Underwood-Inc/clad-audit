import { createColors } from 'picocolors';

/** Whether ANSI colors should be emitted (respects NO_COLOR, FORCE_COLOR, TTY). */
export function resolveColorEnabled(explicit?: boolean): boolean {
  if (explicit === false) return false;
  if (explicit === true) return true;
  if (process.env.NO_COLOR != null && process.env.NO_COLOR !== '') return false;
  if (process.env.FORCE_COLOR != null && process.env.FORCE_COLOR !== '0') return true;
  return Boolean(process.stdout.isTTY);
}

export type Style = {
  bold: (s: string) => string;
  dim: (s: string) => string;
  error: (s: string) => string;
  warning: (s: string) => string;
  info: (s: string) => string;
  success: (s: string) => string;
  accent: (s: string) => string;
  path: (s: string) => string;
  rule: (s: string) => string;
  header: (s: string) => string;
};

const plain = (s: string) => s;

function colorsFor(enabled: boolean) {
  return createColors(enabled);
}

/** Theme helpers; pass-through when color is disabled. */
export function createStyle(colorEnabled: boolean): Style {
  if (!colorEnabled) {
    return {
      bold: plain,
      dim: plain,
      error: plain,
      warning: plain,
      info: plain,
      success: plain,
      accent: plain,
      path: plain,
      rule: plain,
      header: plain,
    };
  }
  const pc = colorsFor(true);
  return {
    bold: pc.bold,
    dim: pc.dim,
    error: (s) => pc.red(s),
    warning: (s) => pc.yellow(s),
    info: (s) => pc.cyan(s),
    success: (s) => pc.green(s),
    accent: (s) => pc.magenta(s),
    path: (s) => pc.blue(s),
    rule: (s) => pc.magenta(s),
    header: (s) => pc.bold(pc.cyan(s)),
  };
}

/** Strip ANSI escape sequences (for tests). */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}
