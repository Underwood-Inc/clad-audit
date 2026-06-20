import { describe, expect, test } from 'vitest';
import {
  describeFindingDepthExposure,
  depthsWhereFindingHidden,
  findingDepthBadge,
  findingVisibleAtDepth,
} from './findingDepth.js';

test('depthsWhereFindingHidden for exhaustive rule', () => {
  expect(depthsWhereFindingHidden('exhaustive')).toEqual(['quick', 'standard', 'deep']);
});

test('describeFindingDepthExposure for quick rule', () => {
  expect(describeFindingDepthExposure({ ruleMinDepth: 'quick' }, 'exhaustive')).toBe(
    'Visible at all analysis depths (quick and deeper)',
  );
});

test('describeFindingDepthExposure for exhaustive rule', () => {
  expect(describeFindingDepthExposure({ ruleMinDepth: 'exhaustive' }, 'exhaustive')).toBe(
    'Requires exhaustive analysis — not reported at quick, standard, deep',
  );
});

test('findingVisibleAtDepth respects rule min depth', () => {
  expect(findingVisibleAtDepth({ ruleMinDepth: 'deep' }, 'standard')).toBe(false);
  expect(findingVisibleAtDepth({ ruleMinDepth: 'deep' }, 'deep')).toBe(true);
});

test('findingDepthBadge highlights non-quick min depths', () => {
  expect(findingDepthBadge({ ruleMinDepth: 'quick' })).toBeUndefined();
  expect(findingDepthBadge({ ruleMinDepth: 'exhaustive' })).toBe('exhaustive only');
});
