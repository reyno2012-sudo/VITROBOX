import type { LyricLine } from '../types';

export function findActiveLyric(lines: LyricLine[], seconds: number) {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (lines[index].time <= seconds) return lines[index];
  }
  return undefined;
}
