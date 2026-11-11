import { useEffect, useRef } from 'react';

export function GeminiCavityWaves({ bass, speed, intensity, contrast, showLines = true }: {
  bass: number; speed: number; intensity: number; contrast: number; showLines?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const signal = useRef({ bass, speed, intensity, showLines });
  signal.current = { bass, speed, intensity, showLines };
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    const particles = Array.from({ length: 38 }, () => ({
      x: Math.random() * 786, y: Math.random() * 439,
      r: Math.random() * 2.2 + 0.6, vx: (Math.random() - 0.5) * 0.35,
      vy: -Math.random() * 0.4 - 0.1, alpha: Math.random() * 0.65 + 0.2,
    }));
    let phase = 0;
    let previous = 0;
    let frame: number;
    function draw(now: number) {
      if (!context) return;
      const input = signal.current;
      const step = Math.min((now - (previous || now)) / 16.667, 3) * input.speed;
      previous = now;
      const energy = input.bass * input.intensity;
      phase += (0.028 + energy * 0.1) * step;
      context.clearRect(0, 0, 786, 439);
      if (input.showLines) {
        for (const [cx, cy] of [[134, 148], [636, 305]]) {
          for (let ring = 1; ring <= 3; ring++) {
            const radius = ((phase * 18 + ring * 26) % 78) + 8;
            const alpha = Math.max(0, (1 - radius / 86) * (0.45 + energy * 0.5));
            context.beginPath();
            context.arc(cx, cy, radius, 0, Math.PI * 2);
            context.strokeStyle = `rgba(255,255,255,${alpha})`;
            context.lineWidth = 2 + energy * 2.5;
            context.stroke();
          }
        }
        [148, 240, 305].forEach((baseY, index) => {
          for (let line = 0; line < 3; line++) {
            context.beginPath();
            context.strokeStyle = `rgba(255,255,255,${0.22 + line * 0.08 + energy * 0.3})`;
            context.lineWidth = 1.4;
            for (let x = 0; x <= 786; x += 10) {
              const amplitude = (12 + line * 6) * (0.45 * input.intensity + energy * 1.45);
              const y = baseY + Math.sin(x * 0.014 + phase * (index + 1) * 0.6 + line * 0.8) * amplitude;
              if (x === 0) context.moveTo(x, y);
              else context.lineTo(x, y);
            }
            context.stroke();
          }
        });
      }
      for (const particle of particles) {
        particle.x = (particle.x + particle.vx * (1 + energy * 2.5) * step + 786) % 786;
        particle.y = (particle.y + particle.vy * (1 + energy * 2.2) * step + 439) % 439;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.r * (1 + energy * 0.6), 0, Math.PI * 2);
        context.fillStyle = `rgba(255,255,255,${particle.alpha})`;
        context.fill();
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas className="gemini-cavity-waves" ref={canvas} width={786} height={439}
    style={{ filter: `contrast(${contrast})` }} aria-hidden="true" />;
}
