import { LyricLine } from '../types';

export function parseLrc(
  lrcText: string,
  transText?: string | null
): { title?: string; artist?: string; lines: LyricLine[] } {
  const lines = lrcText.split(/\r?\n/);
  const resultLines: LyricLine[] = [];
  let title: string | undefined;
  let artist: string | undefined;

  const timeRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const tagRegex = /\[(ti|ar|al|by|offset):([^\]]+)\]/i;

  let index = 0;
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check tags
    const tagMatch = trimmed.match(tagRegex);
    if (tagMatch) {
      const key = tagMatch[1].toLowerCase();
      const val = tagMatch[2].trim();
      if (key === 'ti') title = val;
      if (key === 'ar') artist = val;
      continue;
    }

    // Extract all timestamps in the line
    const timestamps: number[] = [];
    let match: RegExpExecArray | null;
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(trimmed)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const ms = parseFloat(`0.${msStr}`);
      const totalSec = min * 60 + sec + ms;
      timestamps.push(totalSec);
    }

    const cleanText = trimmed.replace(timeRegex, '').trim();

    if (cleanText && timestamps.length > 0) {
      for (const time of timestamps) {
        const layoutStyle: LyricLine['layoutStyle'] =
          index % 3 === 0 ? 'top_right' : index % 3 === 1 ? 'bottom_left' : 'center';

        const words = cleanText.split(/\s+/);
        const highlightWords: string[] = [];
        if (words.length > 3) {
          if (cleanText.toLowerCase().includes('sun')) highlightWords.push('sun');
          else if (cleanText.toLowerCase().includes('strong')) highlightWords.push('strong');
          else if (cleanText.toLowerCase().includes('unstoppable')) highlightWords.push('unstoppable');
          else if (words[0].length <= 5) highlightWords.push(words[0]);
        }

        resultLines.push({
          id: `lyric-${index}-${time}`,
          time,
          text: cleanText,
          layoutStyle,
          highlightWords,
        });
        index++;
      }
    }
  }

  // Parse translations if present
  if (transText && transText.trim()) {
    const transLines = transText.split(/\r?\n/);
    const translationMap: { time: number; text: string }[] = [];

    for (const rawTrans of transLines) {
      const trimmed = rawTrans.trim();
      if (!trimmed) continue;
      timeRegex.lastIndex = 0;
      let m: RegExpExecArray | null;
      const transTimes: number[] = [];
      while ((m = timeRegex.exec(trimmed)) !== null) {
        const min = parseInt(m[1], 10);
        const sec = parseInt(m[2], 10);
        const msStr = m[3] || '0';
        transTimes.push(min * 60 + sec + parseFloat(`0.${msStr}`));
      }
      const transContent = trimmed.replace(timeRegex, '').trim();
      if (transContent) {
        for (const t of transTimes) {
          translationMap.push({ time: t, text: transContent });
        }
      }
    }

    // Match translation to closest line (within 0.75s)
    for (const line of resultLines) {
      const match = translationMap.find((item) => Math.abs(item.time - line.time) <= 0.75);
      if (match && match.text) {
        line.translation = match.text;
      }
    }
  }

  // Sort chronologically
  resultLines.sort((a, b) => a.time - b.time);

  return { title, artist, lines: resultLines };
}
