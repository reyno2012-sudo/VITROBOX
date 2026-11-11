import { useEffect, useState } from 'react';
import type { AudioAnalysis, LyricLine, Track } from '../../types';
import type { ParticleSettings } from '../../visuals/particleSettings';

interface HardwareDisplayProps {
  mode: ParticleSettings['displayMode'];
  isPlaying: boolean;
  currentTime: number;
  lyrics: LyricLine[];
  showLyrics: boolean;
  title: string;
  artist: string;
  album?: string;
  coverArt?: string;
  tracks: Track[];
  onSelectTrack?: (track: Track) => void;
  audioAnalysis: AudioAnalysis;
}

function GalleryClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="cabinet-clock">
    <span>LOCAL TIME</span>
    <time>{String(now.getHours()).padStart(2, '0')}<b>:</b>{String(now.getMinutes()).padStart(2, '0')}</time>
    <small>{now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</small>
  </div>;
}

export function HardwareDisplay({
  mode, isPlaying, currentTime, lyrics, showLyrics, title, artist, album,
  coverArt, tracks, onSelectTrack, audioAnalysis,
}: HardwareDisplayProps) {
  if (mode === 'particles') return null;
  let lyricIndex = lyrics.length - 1;
  while (lyricIndex >= 0 && lyrics[lyricIndex].time > currentTime) lyricIndex--;
  const activeLyric = showLyrics ? lyrics[lyricIndex] : undefined;

  return <div className={`cabinet-display cabinet-display--${mode}`} data-playing={isPlaying}>
    {mode === 'album' && <div className="cabinet-album">
      <div className="cabinet-record-sleeve">
        <div className="cabinet-cd" aria-hidden="true"><span>VITROBOX</span></div>
        <div className="cabinet-cover">
          {coverArt ? <img src={coverArt} alt={title} /> : <span className="cabinet-cover-placeholder">VB</span>}
        </div>
      </div>
      <div className="cabinet-album-copy">
        <span>NOW PLAYING</span>
        <strong>{title}</strong>
        <small>{artist}</small>
        {album && <small className="cabinet-album-name">{album}</small>}
      </div>
    </div>}

    {mode === 'gallery' && <>
      <GalleryClock />
      <div className="cabinet-gallery" aria-label="曲目画廊">
        {tracks.slice(0, 6).map(track => <button key={track.id} type="button"
          className="cabinet-gallery-card" onClick={() => onSelectTrack?.(track)}
          aria-label={`播放 ${track.title}`} title={track.title}>
          {track.coverArt ? <img src={track.coverArt} alt="" /> : <span className="cabinet-cover-placeholder">VB</span>}
          <strong>{track.title}</strong><small>{track.artist}</small>
        </button>)}
      </div>
    </>}

    {mode === 'ambient' && <div className="cabinet-ambient">
      <span className="cabinet-ambient-wordmark">VITROBOX</span>
      <div className="cabinet-spectrum" aria-hidden="true">
        {Array.from({ length: 32 }, (_, index) => {
          const bin = Math.floor(index * audioAnalysis.frequencyData.length / 32);
          const level = isPlaying ? (audioAnalysis.frequencyData[bin] ?? 0) / 255 : 0;
          return <i key={index} style={{ height: `${6 + level * 94}%` }} />;
        })}
      </div>
      <strong>{title}</strong><small>{artist}</small>
    </div>}

    {activeLyric?.text.trim() && <div className="cabinet-display-lyric" data-lyric-time={activeLyric.time}>
      <span>{activeLyric.text}</span>
      {activeLyric.translation && <small>{activeLyric.translation}</small>}
    </div>}
  </div>;
}
