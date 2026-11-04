import type { CSSProperties } from 'react';

interface SpeakerDriversProps {
  bassIntensity: number;
  midIntensity?: number;
  excursionMultiplier?: number;
}

export function SpeakerDrivers({ bassIntensity, midIntensity = 0, excursionMultiplier = 1 }: SpeakerDriversProps) {
  const signal = Math.max(0, Math.min(1, bassIntensity * 0.85 + midIntensity * 0.15));
  const excursion = Math.min(1, Math.pow(signal, 0.8) * excursionMultiplier);
  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
      {['left', 'right'].map(side => (
        <div key={side} className={`a2-driver a2-driver--${side}`}>
          <div className="a2-driver-arm" />
          <div className="a2-driver-ring" style={{ '--excursion': 1 + excursion * 0.035, '--driver-pulse': excursion } as CSSProperties}>
            <div className="a2-driver-annulus" />
            <div className="a2-driver-cone" />
            <div className="a2-driver-sheen" />
            <div className="a2-driver-glass" />
          </div>
        </div>
      ))}
    </div>
  );
}
