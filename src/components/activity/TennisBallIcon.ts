import { createLucideIcon } from 'lucide-react';

/**
 * A simple tennis ball in the Lucide line style (lucide has no tennis icon): the ball outline plus
 * the two curved seams, tilted 45° so it doesn't read as a basketball.
 */
export const TennisBall = createLucideIcon('TennisBall', [
  ['circle', { cx: '12', cy: '12', r: '10', key: 'ball' }],
  ['path', { d: 'M2.34 9.41Q11.65 12.35 14.59 21.66', key: 'seam-lower' }],
  ['path', { d: 'M9.41 2.34Q12.35 11.65 21.66 14.59', key: 'seam-upper' }],
]);
