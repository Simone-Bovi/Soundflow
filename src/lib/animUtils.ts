import { TransitionSpeed } from '../types';

export function getAnimDuration(speed?: TransitionSpeed): number {
  if (speed === 'disabled') return 0;
  if (speed === 'fast') return 0.15;
  if (speed === 'slow') return 0.6;
  return 0.3; // normal default (300ms)
}
