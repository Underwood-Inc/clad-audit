import { afterEach, describe, expect, test } from 'vitest';
import { createStyle, resolveColorEnabled, stripAnsi } from './terminalStyle.js';

describe('terminalStyle', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  test('resolveColorEnabled respects NO_COLOR', () => {
    process.env.NO_COLOR = '1';
    expect(resolveColorEnabled()).toBe(false);
  });

  test('resolveColorEnabled explicit false wins', () => {
    process.env.FORCE_COLOR = '1';
    expect(resolveColorEnabled(false)).toBe(false);
  });

  test('createStyle pass-through when disabled', () => {
    const style = createStyle(false);
    expect(style.error('x')).toBe('x');
  });

  test('createStyle colors when enabled', () => {
    const style = createStyle(true);
    expect(stripAnsi(style.error('x'))).toBe('x');
    expect(style.error('x')).not.toBe('x');
  });
});
