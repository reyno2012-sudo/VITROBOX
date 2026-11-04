import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Clock3, FileText, ListMusic, Music4, Search, SlidersHorizontal, Upload, WandSparkles, X } from 'lucide-react';
import type { LyricLine, Track } from '../types';
import { parseLrc } from '../utils/lrcParser';
import { LrcLibSearchResult, searchLrcLibLyrics } from '../services/spotifyService';

interface LyricsCorrectionModalProps { isOpen: boolean; track: Track; onClose: () => void; onApply: (lyrics: Track['lyrics']) => void; }
interface DraftLine { id: string; time: number; text: string; }

const timestamp = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds * 1000));
  return `[${String(Math.floor(total / 60000)).padStart(2, '0')}:${String(Math.floor(total % 60000 / 1000)).padStart(2, '0')}.${String(total % 1000).padStart(3, '0')}]`;
};
const toLrc = (lines: Array<Pick<DraftLine, 'time' | 'text'>>) => lines.map(line => `${timestamp(line.time)}${line.text}`).join('\n');
const stripLrc = (value: string) => value.split(/\r?\n/).map(line => line.replace(/\[[^\]]+\]/g, '').trim()).filter(Boolean).join('\n');
const toDraftLines = (lines: LyricLine[]): DraftLine[] => lines.map((line, index) => ({ id: `${line.id}-${index}`, time: line.time, text: line.text }));
function makeTimeline(text: string, duration: number) {
  const entries = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const safeDuration = Math.max(10, duration || entries.length * 4.5);
  return entries.map((line, index) => ({ id: `draft-${Date.now()}-${index}`, time: Math.round(((index + 1) * safeDuration / (entries.length + 1)) * 10) / 10, text: line }));
}

export function LyricsCorrectionModal({ isOpen, track, onClose, onApply }: LyricsCorrectionModalProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(track.title); const [artist, setArtist] = useState(track.artist); const [album, setAlbum] = useState(track.album || '');
  const [duration, setDuration] = useState(String(Math.round(track.duration || 0))); const [lrc, setLrc] = useState(() => toLrc(track.lyrics));
  const [plainText, setPlainText] = useState(() => track.lyrics.map(line => line.text).join('\n')); const [draftLines, setDraftLines] = useState<DraftLine[]>(() => toDraftLines(track.lyrics));
  const [editor, setEditor] = useState<'visual' | 'text'>('visual'); const [offsetMs, setOffsetMs] = useState(0); const [results, setResults] = useState<LrcLibSearchResult[]>([]);
  const [searching, setSearching] = useState(false); const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const initialLrc = toLrc(track.lyrics);
    setTitle(track.title); setArtist(track.artist); setAlbum(track.album || ''); setDuration(String(Math.round(track.duration || 0))); setLrc(initialLrc);
    setPlainText(track.lyrics.map(line => line.text).join('\n')); setDraftLines(toDraftLines(track.lyrics)); setEditor(track.lyrics.length ? 'visual' : 'text');
    setOffsetMs(0); setResults([]); setMessage('');
  }, [isOpen, track]);

  const lrcLines = useMemo(() => parseLrc(lrc).lines, [lrc]);
  const validLines = (editor === 'visual' ? draftLines : lrcLines).filter(line => line.text.trim());
  if (!isOpen) return null;

  const search = async () => {
    if (!title.trim()) return setMessage('请先填写曲目名称。');
    setSearching(true); setMessage('');
    try { const matches = await searchLrcLibLyrics(title.trim(), artist.trim()); setResults(matches); if (!matches.length) setMessage('LRCLIB 未找到匹配项。可导入文件或直接创建定时线。'); }
    catch (error: any) { setMessage(error.message || '歌词搜索失败。'); } finally { setSearching(false); }
  };
  const choose = (result: LrcLibSearchResult) => {
    const content = result.syncedLyrics || result.plainLyrics || ''; const foundLines = parseLrc(content).lines;
    setLrc(content); setPlainText(stripLrc(content)); setDraftLines(foundLines.length ? toDraftLines(foundLines) : makeTimeline(stripLrc(content), Number(duration)));
    setTitle(result.trackName || title); setArtist(result.artistName || artist); setAlbum(result.albumName || album); setEditor(result.syncedLyrics ? 'visual' : 'text');
    setMessage(result.syncedLyrics ? '已载入同步歌词，可逐行微调时间。' : '已载入纯文本歌词，请创建定时线。');
  };
  const upload = async (file?: File) => {
    if (!file) return; const content = await file.text(); const foundLines = parseLrc(content).lines;
    setLrc(content); setPlainText(stripLrc(content)); setDraftLines(foundLines.length ? toDraftLines(foundLines) : []); setEditor(foundLines.length ? 'visual' : 'text');
    setMessage(foundLines.length ? `已导入 ${file.name}，可逐行校正。` : `已导入 ${file.name}，请创建定时线。`);
  };
  const createTimeline = () => {
    const lines = makeTimeline(plainText, Number(duration)); if (!lines.length) return setMessage('请先输入至少一行歌词。');
    setDraftLines(lines); setEditor('visual'); setMessage(`已为 ${lines.length} 行歌词创建均匀定时线，可逐行调整。`);
  };
  const updateLine = (id: string, patch: Partial<DraftLine>) => setDraftLines(lines => lines.map(line => line.id === id ? { ...line, ...patch } : line));
  const apply = () => {
    if (!validLines.length) return setMessage(editor === 'text' ? '请切换到可视化编辑器并创建定时线。' : '请至少保留一行歌词。');
    onApply(validLines.slice().sort((a, b) => a.time - b.time).map((line, index) => ({ id: `custom-${track.id}-${index}`, time: Math.max(0, line.time + offsetMs / 1000), text: line.text, layoutStyle: index % 3 === 0 ? 'top_right' as const : index % 3 === 1 ? 'bottom_left' as const : 'center' as const })));
    onClose();
  };

  return <div className="lyrics-manager-backdrop fixed inset-0 z-[70] overflow-y-auto bg-[#05070a]/80 p-3 sm:p-6 backdrop-blur-md">
    <section className="lyrics-manager mx-auto min-h-full w-full max-w-6xl overflow-hidden rounded-2xl border border-[#37414c] bg-[#10151b] text-[#e8edf1] shadow-[0_24px_80px_#000a]">
      <header className="flex items-center justify-between gap-4 border-b border-[#2b3440] px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center bg-[#e9e6d8] text-[#10130f]"><FileText className="size-5" /></span><div><h2 className="text-lg font-black tracking-tight">歌词管理器</h2><p className="text-xs text-[#95a3b2]">为当前歌曲添加、校准并应用自定义同步歌词</p></div></div><button onClick={onClose} aria-label="关闭歌词管理器" className="grid size-9 place-items-center border border-[#35404c] text-[#9fabb7] transition hover:border-[#dfe8ef] hover:text-white"><X className="size-5" /></button></header>
      <div className="lyrics-manager-grid p-5 sm:p-7">
        <div className="lyrics-manager-title"><span className="text-[#5bc4ff]">CUSTOM /</span> 当前歌曲歌词</div><p className="lyrics-manager-intro">自定义歌词将优先用于播放器显示。可以从 LRCLIB 搜索、导入 LRC，或把纯文本逐行变成一条可编辑的时间线。</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="lyrics-manager-field">曲目名称 <b>*</b><input value={title} onChange={e => setTitle(e.target.value)} placeholder="歌曲名" /></label><label className="lyrics-manager-field">艺术家姓名 <b>*</b><input value={artist} onChange={e => setArtist(e.target.value)} placeholder="艺术家姓名" /></label>
          <label className="lyrics-manager-field">专辑名称 <small>可选</small><input value={album} onChange={e => setAlbum(e.target.value)} placeholder="专辑名称" /></label><label className="lyrics-manager-field">持续时间（秒） <small>用于自动定时</small><input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} placeholder="例如，240" /></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#29323d] pt-5"><button onClick={search} disabled={searching} className="lyrics-manager-action"><Search className="size-4" />{searching ? '正在搜索…' : '搜索 LRCLIB'}</button><input ref={uploadRef} type="file" accept=".lrc,.txt,text/plain" className="hidden" onChange={e => upload(e.target.files?.[0])} /><button onClick={() => uploadRef.current?.click()} className="lyrics-manager-secondary"><Upload className="size-4" />导入 .lrc 文件</button><span className="self-center text-xs text-[#82909f]">已识别 {validLines.length} 行</span></div>
        {results.length > 0 && <div className="lyrics-manager-results"><p>LRCLIB 匹配结果</p>{results.map(result => <button key={result.id} onClick={() => choose(result)} className="lyrics-result"><Music4 className="size-4 shrink-0 text-[#48b8ff]" /><span className="min-w-0 text-left"><strong className="block truncate text-sm text-white">{result.trackName}</strong><span className="block truncate text-xs text-[#95a2b1]">{result.artistName}{result.albumName ? ` · ${result.albumName}` : ''}</span></span><span className="ml-auto text-[11px] text-[#82a9c2]">{result.syncedLyrics ? '同步歌词' : '文本歌词'}</span></button>)}</div>}
        <section className="lyrics-workbench"><div className="lyrics-workbench-head"><div><h3>歌词 <b>*</b></h3><p>{editor === 'visual' ? '逐行校正起始时间；整体偏移可处理播放器与歌词的固定误差。' : '粘贴每行歌词后，系统可根据歌曲时长自动创建初始定时线。'}</p></div><div className="lyrics-editor-tabs"><button onClick={() => setEditor('visual')} className={editor === 'visual' ? 'is-active' : ''}><ListMusic className="size-4" />可视化编辑器</button><button onClick={() => setEditor('text')} className={editor === 'text' ? 'is-active' : ''}>纯文本 / LRC</button></div></div>
          {editor === 'visual' ? <div className="lyrics-visual-editor">{draftLines.length ? <div className="lyrics-timeline-list">{draftLines.map((line, index) => <div key={line.id} className="lyrics-timeline-row"><span className="lyrics-timeline-index">{String(index + 1).padStart(2, '0')}</span><input aria-label={`第 ${index + 1} 行时间`} type="number" step="0.1" min="0" value={Number.isFinite(line.time) ? line.time : 0} onChange={e => updateLine(line.id, { time: Number(e.target.value) })} /><span className="text-[#6f8191]">s</span><input aria-label={`第 ${index + 1} 行歌词`} value={line.text} onChange={e => updateLine(line.id, { text: e.target.value })} /><button onClick={() => setDraftLines(lines => lines.filter(item => item.id !== line.id))} aria-label={`删除第 ${index + 1} 行`} className="lyrics-line-delete">×</button></div>)}</div> : <div className="lyrics-empty-state"><Clock3 className="size-6" /><p>还没有定时线</p><span>从纯文本歌词生成，或先导入一个 LRC 文件。</span></div>}<div className="lyrics-visual-footer"><button onClick={() => { setEditor('text'); setLrc(toLrc(draftLines)); }} className="lyrics-manager-secondary">查看原始 LRC</button><button onClick={() => setDraftLines(lines => [...lines, { id: `draft-${Date.now()}`, time: lines.length ? lines[lines.length - 1].time + 3 : 0, text: '新歌词' }])} className="lyrics-manager-secondary">＋ 添加一行</button></div></div> : <div className="lyrics-text-editor"><textarea id="lyrics-editor" value={lrc || plainText} onChange={e => { setLrc(e.target.value); setPlainText(stripLrc(e.target.value)); }} spellCheck={false} placeholder="每行一句歌词；也可直接粘贴 [00:12.340] 带时间戳的 LRC" /><div className="lyrics-text-footer"><button onClick={() => { const found = parseLrc(lrc).lines; if (found.length) { setDraftLines(toDraftLines(found)); setEditor('visual'); setMessage('已读取 LRC 时间戳，可逐行校正。'); } else createTimeline(); }} className="lyrics-manager-action"><WandSparkles className="size-4" />{parseLrc(lrc).lines.length ? '载入定时线' : '创建定时线'}</button><span>纯文本会按照填写的歌曲时长均匀排布，随后可精细调整。</span></div></div>}</section>
        <div className="lyrics-alignment"><div><div className="flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4 text-[#5bc4ff]" />歌词整体对齐</div><p>正值让歌词延后；负值让歌词提前。逐行编辑不会被此操作覆盖。</p></div><div className="flex items-center gap-2"><button className="lyrics-step" onClick={() => setOffsetMs(value => value - 100)}>-100 ms</button><output>{offsetMs > 0 ? '+' : ''}{offsetMs} ms</output><button className="lyrics-step" onClick={() => setOffsetMs(value => value + 100)}>+100 ms</button><button onClick={() => setOffsetMs(0)} className="lyrics-reset">重置</button></div></div>
        {message && <p className="lyrics-manager-message">{message}</p>}<footer className="flex justify-end gap-3 border-t border-[#29323d] pt-5"><button onClick={onClose} className="lyrics-manager-secondary w-auto px-5">取消</button><button onClick={apply} className="lyrics-manager-save"><Check className="size-4" />应用到播放器</button></footer>
      </div>
    </section>
  </div>;
}
