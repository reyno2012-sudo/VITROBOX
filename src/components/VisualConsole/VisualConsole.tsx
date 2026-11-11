import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent, ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cabinetViews, defaultParticleSettings, displayModes, particlePalettes, particlePresets } from '../../visuals/particleSettings';
import type { ParticleSettings } from '../../visuals/particleSettings';
import './VisualConsole.css';

interface VisualConsoleProps {
  settings: ParticleSettings;
  onSettingsChange: (patch: Partial<ParticleSettings>) => void;
  onClose: () => void;
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
  trackTitle?: string;
  audioSource?: string;
  previewLyrics?: string[] | null;
  onPreviewLyrics?: (lines: string[] | null) => void;
}

const tabs = [
  ['interface', '界面'],
  ['presets', '粒子'],
  ['lyrics', '歌词'],
  ['effects', '动效'],
  ['playlist', '歌单架'],
  ['archive', '存档'],
  ['system', '系统'],
] as const;

const demoSets = [
  { name: '空灵中文', lines: ['让声音有形状', '每一句歌词都在呼吸', '让节奏在屏幕里绽放', '把音乐留在眼前'] },
  { name: '短句错落', lines: ['靠近一点', '让光落下来', '在你开口之前', '我已经听见'] },
  { name: '英文节奏', lines: ['I see sparks', 'Moving through the dark', 'Hold the rhythm', 'Let the colors bloom'] },
  { name: '中英双语', lines: ['让夜晚发光 / Light up the night', '跟着音乐呼吸 / Breathe with the beat', '把时间放慢 / Slow down the time'] },
];

const lyricModes = [['single', '单行'], ['double', '双行'], ['stack', '三行'], ['float', '漂浮']] as const;
const lyricEffects = [['rise', '上浮'], ['pop', '弹出'], ['sweep', '横扫'], ['soft', '柔焦']] as const;
const lyricFonts = [['sans', '无衬线'], ['serif', '衬线'], ['mono', '等宽']] as const;
const lyricColors = ['#263238', '#ffffff', '#f7e7b0', '#b8eaff', '#d9c4fa', '#b6f2d5', '#f1bdd4', '#f5a881'];
const archiveKey = 'vitrobox-merged-preview-visuals';

const ranges = {
  backgroundOpacity: ['封面透明度', 0, 1, .01],
  lyricSize: ['文字大小', .5, 1.7, .05],
  lyricX: ['左右位置', -35, 35, 1],
  lyricY: ['上下位置', -35, 35, 1],
  lyricRotation: ['倾斜角度', -20, 20, 1],
  lyricSpacing: ['字间距', 0, .18, .005],
  lyricWeight: ['字重', 400, 900, 100],
  intensity: ['律动强度', .35, 1.8, .05],
  particleSize: ['粒子尺寸', .5, 2, .05],
  speed: ['运动速度', .2, 2.5, .05],
  glow: ['粒子光泽', 0, 1, .05],
  hue: ['粒子色相', -180, 180, 1],
  contrast: ['画面对比度', .7, 1.6, .01],
  cameraZoom: ['视图缩放', .75, 1.3, .01],
  glassSheen: ['玻璃反光', 0, 1, .01],
} as const;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('参数格式无效');
  return value as Record<string, unknown>;
}

function decodeArchive(value: string) {
  const archive = record(JSON.parse(value));
  const raw = archive.settings ? record(archive.settings) : archive;
  const patch: Partial<ParticleSettings> = {};
  for (const key of Object.keys(ranges) as Array<keyof typeof ranges>) {
    const number = raw[key] ?? archive[key];
    const [, min, max] = ranges[key];
    if (typeof number === 'number' && Number.isFinite(number)) patch[key] = Math.min(max, Math.max(min, number));
  }
  const palette = raw.palette ?? archive.palette;
  if (typeof palette === 'number' && Number.isInteger(palette) && particlePalettes[palette]) patch.palette = palette;
  if (typeof raw.preset === 'number' && Number.isInteger(raw.preset) && particlePresets[raw.preset]) patch.preset = raw.preset;
  const mode = lyricModes.find(([key]) => key === raw.lyricMode)?.[0];
  const effect = lyricEffects.find(([key]) => key === raw.lyricEffect)?.[0];
  const font = lyricFonts.find(([key]) => key === raw.lyricFont)?.[0];
  if (mode) patch.lyricMode = mode;
  if (effect) patch.lyricEffect = effect;
  if (font) patch.lyricFont = font;
  if (typeof raw.lyricColor === 'string' && /^#[0-9a-f]{6}$/i.test(raw.lyricColor)) patch.lyricColor = raw.lyricColor;
  if (typeof raw.showSpeakers === 'boolean') patch.showSpeakers = raw.showSpeakers;
  if (typeof raw.showLyrics === 'boolean') patch.showLyrics = raw.showLyrics;
  const display = displayModes.find(([key]) => key === raw.displayMode)?.[0];
  const camera = cabinetViews.find(view => view.id === raw.cameraView)?.id;
  if (display) patch.displayMode = display;
  if (camera) patch.cameraView = camera;
  if (raw.roomMode === 'studio') patch.roomMode = raw.roomMode;
  if (!Object.keys(patch).length) throw new Error('没有可读取的视觉参数');
  return patch;
}

function ControlCard({ title, note, children }: { title?: string; note?: string; children: ReactNode }) {
  return <section className="visual-console-card">
    {title && <h3>{title}</h3>}
    {note && <p className="visual-console-note">{note}</p>}
    {children}
  </section>;
}

function ChoiceGroup<T extends string | number>({ label, choices, value, onSelect }: {
  label: string;
  choices: ReadonlyArray<readonly [T, string]>;
  value: T;
  onSelect: (key: T) => void;
}) {
  return <div className="visual-console-choice-group" role="group" aria-label={label}>
    <span>{label}</span>
    <div className="visual-console-button-row">
      {choices.map(([key, name]) => (
        <button key={key} type="button" className="visual-console-button" aria-pressed={value === key} onClick={() => onSelect(key)}>
          {name}
        </button>
      ))}
    </div>
  </div>;
}

export function VisualConsole({
  settings, onSettingsChange, onClose, isPlaying, onTogglePlayback,
  trackTitle, audioSource, previewLyrics, onPreviewLyrics,
}: VisualConsoleProps) {
  const [tab, setTab] = useState<typeof tabs[number][0]>('interface');
  const [draftLyrics, setDraftLyrics] = useState(previewLyrics?.join('\n') ?? '');
  const [archiveCode, setArchiveCode] = useState('');
  const [message, setMessage] = useState('');
  const closeButton = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageReader = useRef<FileReader | null>(null);

  useEffect(() => {
    closeButton.current?.focus({ preventScroll: true });
    return () => imageReader.current?.abort();
  }, []);

  const presetName = settings.displayMode === 'particles'
    ? particlePresets[settings.preset]?.name ?? particlePresets[0].name
    : displayModes.find(([key]) => key === settings.displayMode)?.[1];

  function update<K extends keyof ParticleSettings>(key: K, value: ParticleSettings[K]) {
    onSettingsChange({ [key]: value });
  }

  function slider(key: keyof typeof ranges) {
    const [label, min, max, step] = ranges[key];
    const precision = step >= 1 ? 0 : key === 'lyricSpacing' ? 3 : 2;
    return <label className="visual-console-slider" key={key}>
      <span>{label}</span>
      <input className="gear-fader" type="range" min={min} max={max} step={step} value={settings[key]}
        onChange={event => update(key, Number(event.currentTarget.value))} />
      <output>{settings[key].toFixed(precision)}</output>
    </label>;
  }

  function readImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('请选择图片文件');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage('请选择 8 MB 以内的图片');
      return;
    }
    imageReader.current?.abort();
    const reader = new FileReader();
    imageReader.current = reader;
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      update('backgroundImage', reader.result);
      setMessage('已应用封面');
    };
    reader.onerror = () => setMessage('图片读取失败');
    reader.readAsDataURL(file);
  }

  function clearImage() {
    imageReader.current?.abort();
    update('backgroundImage', null);
    setMessage('已清除封面');
  }

  function applyDemo(lines: string[]) {
    const cleaned = lines.map(line => line.trim()).filter(Boolean).slice(0, 30);
    if (!cleaned.length) {
      setMessage('至少输入一行歌词');
      return;
    }
    setDraftLyrics(cleaned.join('\n'));
    onPreviewLyrics?.(cleaned);
    setMessage('已应用演示歌词');
  }

  function snapshot() {
    const { backgroundImage, ...portableSettings } = settings;
    return JSON.stringify({ version: 1, settings: portableSettings }, null, 2);
  }

  function restore(code: string, success: string) {
    try {
      onSettingsChange(decodeArchive(code));
      setArchiveCode(code);
      setMessage(success);
    } catch {
      setMessage('无法读取视觉参数，请检查 JSON 内容');
    }
  }

  function reset() {
    imageReader.current?.abort();
    onSettingsChange({ ...defaultParticleSettings });
    onPreviewLyrics?.(null);
    setDraftLyrics('');
    setMessage('已恢复默认视觉参数');
  }

  return (
    <section id="vitrobox-visual-console" className="visual-console" aria-labelledby="visual-console-title"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}>
      <header className="visual-console-header">
        <span className="visual-console-mark" aria-hidden="true"><Sparkles size={16} /></span>
        <h2 id="visual-console-title">视觉控制台</h2>
        <span className="visual-console-live">LIVE</span>
        <button className="visual-console-button visual-console-close" type="button" ref={closeButton} aria-label="关闭视觉控制台" onClick={onClose}>
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      <div className="visual-console-body">
        <aside className="visual-console-sidebar" aria-label="当前预览状态">
          <div className="gear-display visual-console-display">
            <div className="gear-display-heading">VITROBOX - VISUALS</div>
            <dl>
              <dt>当前视觉样式</dt><dd>{presetName}</dd>
              <dt>播放响应</dt><dd>{audioSource || (isPlaying ? '播放中' : '待播放')}</dd>
              {trackTitle && <><dt>当前曲目</dt><dd title={trackTitle}>{trackTitle}</dd></>}
            </dl>
          </div>
          <p className="visual-console-note" role="status">{message}</p>
        </aside>

        <div className="visual-console-content">
          <nav className="visual-console-tabs" aria-label="视觉控制分类">
            {tabs.filter(([id]) => id !== 'playlist' || onPreviewLyrics).map(([id, label]) => (
              <button type="button" key={id} className="visual-console-button" aria-pressed={tab === id}
                onClick={() => { setTab(id); setMessage(''); }}>
                {label}
              </button>
            ))}
          </nav>

          {tab === 'presets' && <section className="visual-console-card" aria-label="视觉预设">
            <div className="visual-console-presets">
              {particlePresets.map((preset, index) => (
                <button type="button" key={preset.name} className="visual-console-button visual-console-preset"
                  style={{ '--preset-accent': preset.accent } as CSSProperties} aria-pressed={settings.preset === index}
                  onClick={() => onSettingsChange({ preset: index, palette: preset.palette, displayMode: 'particles' })}>
                  <span className="visual-console-preset-icon" aria-hidden="true">{preset.symbol}</span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                </button>
              ))}
            </div>
          </section>}

          {tab === 'interface' && <>
            <ControlCard>
              <ChoiceGroup label="屏幕模式" choices={displayModes} value={settings.displayMode} onSelect={value => update('displayMode', value)} />
              <div className="visual-console-columns">
                <div>{slider('cameraZoom')}{slider('glassSheen')}</div>
                <div>
                  <p className="visual-console-note">拖拽音箱旋转，滚轮缩放。方向键旋转，Home 回到正面。全屏时使用正面视图。</p>
                </div>
              </div>
            </ControlCard>
            <ControlCard note="设置屏幕底色，可叠加本地封面图片。">
            <div className="visual-console-columns">
              <div>
                <ChoiceGroup label="背景配色" choices={particlePalettes.map((palette, index) => [index, palette.name] as const)}
                  value={settings.palette} onSelect={value => update('palette', value)} />
                <div className="visual-console-choice-group">
                  <span>喇叭模型</span>
                  <button type="button" className="visual-console-button" aria-pressed={settings.showSpeakers}
                    onClick={() => update('showSpeakers', !settings.showSpeakers)}>{settings.showSpeakers ? '显示' : '隐藏'}</button>
                </div>
              </div>
              <div>
                <div className="visual-console-button-row">
                  <input ref={fileInput} type="file" accept="image/*" hidden onChange={readImage} />
                  <button type="button" className="visual-console-button" onClick={() => fileInput.current?.click()}>选择本地封面</button>
                  <button type="button" className="visual-console-button" disabled={!settings.backgroundImage} onClick={clearImage}>清除封面</button>
                </div>
                {slider('backgroundOpacity')}
              </div>
            </div>
          </ControlCard></>}

          {tab === 'lyrics' && <div className={onPreviewLyrics ? 'visual-console-lyric-columns' : undefined}>
            <ControlCard note="同步当前曲目的歌词，可调整排版与入场方式。">
              <div className="visual-console-columns">
                <div>
                  <ChoiceGroup label="排版状态" choices={lyricModes} value={settings.lyricMode} onSelect={value => update('lyricMode', value)} />
                  <ChoiceGroup label="进场动画" choices={lyricEffects} value={settings.lyricEffect} onSelect={value => update('lyricEffect', value)} />
                  <ChoiceGroup label="字体" choices={lyricFonts} value={settings.lyricFont} onSelect={value => update('lyricFont', value)} />
                  <div className="visual-console-choice-group">
                    <span>文字颜色</span>
                    <div className="visual-console-colors">
                      {lyricColors.map(color => (
                        <button type="button" className="gear-lens" key={color} aria-label={'歌词颜色 ' + color}
                          style={{ '--lens-color': color } as CSSProperties} aria-pressed={settings.lyricColor === color}
                          onClick={() => update('lyricColor', color)}><span /></button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  {slider('lyricSize')}{slider('lyricX')}{slider('lyricY')}{slider('lyricRotation')}{slider('lyricSpacing')}{slider('lyricWeight')}
                </div>
              </div>
            </ControlCard>
            {onPreviewLyrics && <ControlCard title="演示歌词" note="每行一句，用于预览字幕排版。">
              <textarea aria-label="演示歌词" placeholder="每行输入一句歌词" value={draftLyrics} onChange={event => setDraftLyrics(event.currentTarget.value)} />
              <div className="visual-console-button-row">
                <button type="button" className="visual-console-button visual-console-primary" onClick={() => applyDemo(draftLyrics.split(/\r?\n/))}>应用演示歌词</button>
                <button type="button" className="visual-console-button" disabled={!previewLyrics} onClick={() => {
                  onPreviewLyrics(null);
                  setMessage('已恢复曲目歌词');
                }}>恢复曲目歌词</button>
              </div>
            </ControlCard>}
          </div>}

          {tab === 'effects' && <ControlCard title="粒子与节奏" note="调整画面律动、粒子大小和发光效果。">
            <div className="visual-console-columns">
              <div>{slider('intensity')}{slider('particleSize')}{slider('speed')}</div>
              <div>{slider('glow')}{slider('hue')}{slider('contrast')}</div>
            </div>
          </ControlCard>}

          {tab === 'playlist' && onPreviewLyrics && <ControlCard title="演示歌词组" note="选择不同语言和句长，预览粒子与字幕的组合。">
            <div className="visual-console-presets">
              {demoSets.map(demo => (
                <button type="button" key={demo.name} className="visual-console-button visual-console-preset"
                  onClick={() => { applyDemo(demo.lines); setTab('lyrics'); }}>
                  <span className="visual-console-preset-icon" aria-hidden="true">♫</span><strong>{demo.name}</strong>
                  <small>{demo.lines.length} 句</small>
                </button>
              ))}
            </div>
          </ControlCard>}

          {tab === 'archive' && <ControlCard title="用户存档" note="保存、复制或导入视觉参数。">
            <textarea aria-label="存档 JSON" placeholder="这里显示 JSON 参数，也可粘贴已有参数"
              value={archiveCode} onChange={event => setArchiveCode(event.currentTarget.value)} />
            <div className="visual-console-button-row">
              <button type="button" className="visual-console-button" onClick={() => {
                try {
                  localStorage.setItem(archiveKey, snapshot());
                  setMessage('已保存到浏览器');
                } catch { setMessage('浏览器无法保存存档'); }
              }}>保存到浏览器</button>
              <button type="button" className="visual-console-button" onClick={() => {
                try {
                  const code = localStorage.getItem(archiveKey);
                  if (code) restore(code, '已读取存档');
                  else setMessage('暂无存档');
                } catch { setMessage('浏览器无法读取存档'); }
              }}>读取存档</button>
              <button type="button" className="visual-console-button" onClick={async () => {
                const code = snapshot();
                setArchiveCode(code);
                try {
                  await navigator.clipboard.writeText(code);
                  setMessage('已复制参数');
                } catch { setMessage('参数已显示，可手动复制'); }
              }}>复制参数</button>
              <button type="button" className="visual-console-button visual-console-primary" onClick={() => restore(archiveCode, '已应用视觉参数')}>应用粘贴参数</button>
              <button type="button" className="visual-console-button" onClick={() => {
                const url = URL.createObjectURL(new Blob([snapshot()], { type: 'application/json' }));
                const link = document.createElement('a');
                link.href = url;
                link.download = 'vitrobox-visual-preset.json';
                link.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                setMessage('已下载参数');
              }}>下载 JSON</button>
              <button type="button" className="visual-console-button" onClick={reset}>恢复默认</button>
            </div>
          </ControlCard>}

          {tab === 'system' && <ControlCard title="预览运行" note="控制当前播放及视觉显示。">
            <div className="visual-console-button-row">
              {onTogglePlayback && <button type="button" className="visual-console-button visual-console-primary" onClick={onTogglePlayback}>{isPlaying ? '暂停播放' : '继续播放'}</button>}
              <button type="button" className="visual-console-button" onClick={() => update('showLyrics', !settings.showLyrics)}>
                {settings.showLyrics ? '隐藏歌词' : '显示歌词'}
              </button>
              <button type="button" className="visual-console-button" onClick={reset}>重置所有参数</button>
            </div>
          </ControlCard>}
        </div>
      </div>
    </section>
  );
}

export default VisualConsole;
