export type DisplayMode = 'aquarium' | 'graphic_poster' | 'fluid_spectrum' | 'minimalist';

export type TypographyStyle = 'pop_sticker' | 'swiss_editorial' | 'floating_mist';

export type LightingTheme = 'pure_white' | 'warm_amber' | 'cyber_blue' | 'twilight_orchid' | 'emerald_aurora' | 'midnight';

export interface LyricLine {
  id: string;
  time: number; // in seconds
  text: string;
  translation?: string; // Optional bilingual translated text (e.g. from NetEase/QQ)
  highlightWords?: string[]; // words to highlight in black inverted blocks
  layoutStyle?: 'top_right' | 'bottom_left' | 'center' | 'scatter';
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  audioUrl?: string; // audio source URL or blob URL
  synthPreset?: 'unstoppable' | 'sunny_day' | 'synthwave' | 'bossa_jazz' | 'lofi_chill';
  lyrics: LyricLine[];
  coverArt?: string;
}

export interface AudioAnalysis {
  bass: number; // 0..1
  mid: number; // 0..1
  treble: number; // 0..1
  energy: number; // 0..1
  frequencyData: Uint8Array;
}
