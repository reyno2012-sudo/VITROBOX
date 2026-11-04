import { useMemo, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { LyricLine, TypographyStyle, LightingTheme } from '../../types';
import { findActiveLyric } from '../../utils/lyricTimeline';

const LYRIC_LEAD_SECONDS = 0.5;
const LYRIC_EXIT_SECONDS = 0.42;
const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeToMotionPreference(onChange: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const readMotionPreference = () => window.matchMedia(motionQuery).matches;
const serverMotionPreference = () => true;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
// A small overshoot settles completely within the existing entrance window.
function springRemainder(progress: number) {
  const remaining = progress - 1;
  return -remaining * remaining * (2.4 * remaining + 1.4);
}
const textWidth = (text: string) => Array.from(text).reduce((width, char) =>
  width + (/[\u3400-\u9fff]/u.test(char) ? 1 : /\s/u.test(char) ? 0.3 : 0.56), 0);

function arrangeText(text: string) {
  // Keep Latin words intact while allowing Chinese to break between characters.
  const units = text.match(/[\u3400-\u9fff]|[^\s\u3400-\u9fff]+\s*|\s+/gu) || [text];
  const target = textWidth(text) / Math.min(3, Math.max(1, Math.ceil(textWidth(text) / 19)));
  const rows: string[] = [];
  let row = '';
  for (const unit of units) {
    if (row && textWidth(row + unit) > target + 1 && rows.length < 2) {
      rows.push(row.trim());
      row = '';
    }
    row += unit;
  }
  if (row.trim()) rows.push(row.trim());
  const size = Math.min(2.8, 46 / (Math.max(1, ...rows.map(textWidth)) + 1)) * 2;
  // Reflow at the enlarged size instead of clipping the former line layout.
  const largeRows: string[] = [];
  const largeTarget = textWidth(text) / Math.max(1, Math.ceil(textWidth(text) / (40 / size)));
  row = '';
  for (const unit of units) {
    if (row && textWidth(row + unit) > Math.min(40 / size, largeTarget + 0.5)) {
      largeRows.push(row.trim());
      row = '';
    }
    row += unit;
  }
  if (row.trim()) largeRows.push(row.trim());
  return { rows: largeRows, size };
}

function LyricScene({ line, phase, elapsed, reduced, style, exitPhase = 0 }: {
  line: LyricLine;
  phase: number;
  elapsed: number;
  exitPhase?: number;
  reduced: boolean;
  style?: TypographyStyle;
}) {
  const { rows, size } = useMemo(() => arrangeText(line.text), [line.text]);
  const plain = line.id.startsWith('plain');
  const progress = reduced || plain ? 1 : phase;
  const animated = !reduced && !plain;
  const strength = style === 'swiss_editorial' ? 0.45 : 1;
  const direction = Math.floor(line.time) % 2 === 0 ? 1 : -1;
  const motion = animated ? springRemainder(progress) * strength : 0;
  const retreat = animated ? exitPhase * exitPhase * strength : 0;
  const opacity = Math.min(progress, 1 - exitPhase);
  const drift = reduced || plain ? 0 : Math.sin(elapsed * 0.65) * 0.22;
  return (
    <div className={`a2-lyric-scene ${plain ? 'a2-lyric-scene--plain' : ''} ${style === 'floating_mist' ? 'a2-lyric-scene--outline' : ''}`}
      style={{
        '--lyric-size': `${size}cqw`,
        opacity: plain ? 1 : opacity,
        transform: `translate(${direction * (motion * 3.2 - retreat * 2.8)}cqw, ${motion * 2.5 - retreat * 2 + drift}cqw) rotate(${direction * (motion * 2 - retreat * 1.5)}deg) scale(${1 - motion * 0.12 - retreat * 0.055})`,
      } as CSSProperties}
      aria-label={line.text}>
      {(plain ? [line.text] : rows).map((row, rowIndex) => {
        const stagger = rows.length > 1 ? rowIndex / (rows.length - 1) * 0.24 : 0;
        const rowProgress = clamp(progress * (1 + stagger) - stagger);
        const fold = animated ? springRemainder(rowProgress) * strength : 0;
        const rowDirection = rowIndex % 2 === 0 ? direction : -direction;
        return (
          <div className="a2-lyric-row" key={rowIndex} aria-hidden="true" style={{
            transform: `perspective(700px) translateX(${rowDirection * (fold * 0.45 + retreat * 0.2)}em) rotateX(${fold * 22}deg) skewX(${rowDirection * (fold * 3 - retreat * 2)}deg)`,
          }}>
            {row}
          </div>
        );
      })}
      {line.translation && <small className="a2-translation">{line.translation}</small>}
    </div>
  );
}

export function KineticLyrics({ lyrics, currentTime, typographyStyle, theme }: {
  lyrics: LyricLine[];
  currentTime: number;
  typographyStyle?: TypographyStyle;
  theme: LightingTheme;
}) {
  const reduceMotion = useSyncExternalStore(subscribeToMotionPreference, readMotionPreference, serverMotionPreference);
  const line = findActiveLyric(lyrics, currentTime + LYRIC_LEAD_SECONDS);
  if (!line || !line.text.trim()) return null;
  const index = lyrics.indexOf(line);
  const elapsed = Math.max(0, currentTime - line.time + LYRIC_LEAD_SECONDS);
  const phase = clamp(elapsed / LYRIC_LEAD_SECONDS);
  const next = lyrics[index + 1];
  // Finish fading before the next line's early entrance. Only one scene exists.
  const fadeDuration = next ? Math.min(LYRIC_EXIT_SECONDS, (next.time - line.time) / 2) : 0;
  const exitPhase = next && fadeDuration > 0
    ? clamp(1 - (next.time - LYRIC_LEAD_SECONDS - currentTime) / fadeDuration)
    : 0;
  const plain = line.id.startsWith('plain');
  const pulse = Math.sin(phase * Math.PI) * (1 - phase);
  const angle = reduceMotion || plain ? 0 : Math.sin(currentTime * 0.15) * 13 + pulse * 4;
  const shift = reduceMotion || plain ? 0 : Math.sin(currentTime * 0.24) * 48 + pulse * 24;
  const light = !['pure_white', 'warm_amber'].includes(theme);
  return (
    <div className={`a2-kinetic-stage ${light ? 'a2-lyrics--light' : ''}`}>
      {!plain && <svg className="a2-geometry" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
        <g transform={`translate(${shift} 0) rotate(${angle} 500 300)`}>
          <path d="M-240 80 L1240 210 M-150 560 L1210 390" strokeWidth="1.5" />
          <path d="M270 -220 L30 850 M980 -200 L720 850" strokeWidth="2.5" />
          <path d="M-180 -110 L1200 730" strokeWidth="5" opacity=".65" />
        </g>
      </svg>}
      <div className="a2-lyrics">
        <LyricScene line={line} phase={phase} exitPhase={exitPhase} elapsed={elapsed} reduced={reduceMotion} style={typographyStyle} />
      </div>
    </div>
  );
}
