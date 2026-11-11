export interface ParticleSettings {
  preset: number;
  palette: number;
  intensity: number;
  speed: number;
  particleSize: number;
  glow: number;
  hue: number;
  contrast: number;
  lyricMode: 'single' | 'double' | 'stack' | 'float';
  lyricSize: number;
  lyricX: number;
  lyricY: number;
  lyricRotation: number;
  lyricSpacing: number;
  lyricWeight: number;
  lyricColor: string;
  lyricEffect: 'rise' | 'pop' | 'sweep' | 'soft';
  lyricFont: 'sans' | 'serif' | 'mono';
  showLyrics: boolean;
  showSpeakers: boolean;
  backgroundImage: string | null;
  backgroundOpacity: number;
  displayMode: 'particles' | 'album' | 'kinetic' | 'gallery' | 'ambient';
  cameraView: 'front' | 'angle' | 'depth' | 'left' | 'right';
  cameraZoom: number;
  glassSheen: number;
  roomMode: 'studio' | 'walnut';
}

export const defaultParticleSettings: ParticleSettings = {
  preset: 0,
  palette: 0,
  intensity: 1,
  speed: 1,
  particleSize: 1,
  glow: 0.5,
  hue: 0,
  contrast: 1,
  lyricMode: 'double',
  lyricSize: 1.2,
  lyricX: 5,
  lyricY: 0,
  lyricRotation: -20,
  lyricSpacing: 0.065,
  lyricWeight: 700,
  lyricColor: '#263238',
  lyricEffect: 'pop',
  lyricFont: 'sans',
  showLyrics: true,
  showSpeakers: true,
  backgroundImage: null,
  backgroundOpacity: 0.28,
  displayMode: 'album',
  cameraView: 'front',
  cameraZoom: 1,
  glassSheen: 0.59,
  roomMode: 'studio',
};

export const displayModes = [
  ['album', '唱片'],
  ['particles', '粒子'],
  ['kinetic', '灵动'],
  ['gallery', '画廊'],
  ['ambient', '极简'],
] as const;

export const cabinetViews = [
  { id: 'front', name: '正面', pitch: 0, yaw: 0, zoom: 1, x: 0, y: 0 },
] as const;

export const particlePalettes = [
  { name: '深海', background: '#070a13', primary: [97, 220, 210], secondary: [143, 116, 255], highlight: [218, 255, 239] },
  { name: '琥珀', background: '#120b0b', primary: [242, 178, 105], secondary: [252, 121, 89], highlight: [255, 236, 193] },
  { name: '冰蓝', background: '#07121b', primary: [122, 204, 255], secondary: [105, 121, 255], highlight: [226, 249, 255] },
] as const;

export const particlePresets = [
  { name: '深海绽放', description: '花冠 · 呼吸生长', symbol: '✳', accent: '#286d65', palette: 0 },
  { name: '月蚀圣环', description: '环轨 · 冷金日冕', symbol: '◉', accent: '#8c764c', palette: 1 },
  { name: '雨幕霓虹', description: '垂直雨丝 · 流动', symbol: '╎', accent: '#3b6989', palette: 2 },
  { name: '折光蝶群', description: '双翼 · 光谱跃迁', symbol: '⋈', accent: '#68538c', palette: 2 },
  { name: '星河', description: '旋臂 · 深空轨迹', symbol: '✦', accent: '#4a5d98', palette: 0 },
  { name: '唱片', description: '同心纹路 · 旋转', symbol: '◎', accent: '#6c554d', palette: 1 },
  { name: '星球', description: '经纬光点 · 自转', symbol: '◌', accent: '#467c87', palette: 2 },
  { name: '漩涡', description: '隧道 · 空间深度', symbol: '◍', accent: '#3d806c', palette: 0 },
  { name: '音域回响', description: '频谱波形 · 起伏', symbol: '≋', accent: '#538888', palette: 0 },
  { name: '虚空', description: '仅保留背景与歌词', symbol: '∅', accent: '#343a3c', palette: 0 },
] as const;
