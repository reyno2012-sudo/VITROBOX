import { particlePalettes, type ParticleSettings } from './particleSettings';

const TAU = Math.PI * 2;
const columns = 132;
const rows = 70;
const sinPitch = Math.sin(-0.34);
const cosPitch = Math.cos(-0.34);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function smooth(start: number, end: number, value: number) {
  const x = clamp((value - start) / (end - start), 0, 1);
  return x * x * (3 - 2 * x);
}

function rgba([r, g, b]: readonly number[], alpha: number) {
  return `rgba(${r},${g},${b},${alpha})`;
}

// Fixed samples keep dots and their colors stable as the shape moves.
const particles = Array.from({ length: columns * rows }, (_, index) => {
  const u = (index % columns + 0.5) / columns;
  const v = (Math.floor(index / columns) + 0.5) / rows;
  const radius = v ** 0.76;
  const tint = smooth(0.45, 0.9, radius);
  const colors = particlePalettes.map(palette => {
    const base = radius < 0.48 ? palette.primary : palette.secondary;
    const rgb = base.map((value, channel) => Math.round(value * (1 - tint) + palette.highlight[channel] * tint));
    return `rgb(${rgb.join(',')})`;
  });
  return {
    u, v, radius, colors,
    angle: u * TAU,
    seed: Math.random(),
    twinkle: Math.random() * TAU,
    edge: smooth(0.53, 0.98, radius),
    edgeFade: 1 - smooth(0.94, 1, radius) * 0.35,
  };
});
const stars = Array.from({ length: 190 }, () => ({
  x: Math.random(), y: Math.random(), radius: 0.25 + Math.random() * 0.8, phase: Math.random() * TAU,
}));

export function drawParticleScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  pulse: number,
  settings: ParticleSettings,
  backdrop: HTMLImageElement | null,
  minimalist: boolean,
  transparentBackground = false,
) {
  const palette = particlePalettes[settings.palette] ?? particlePalettes[0];
  ctx.globalAlpha = 1;
  if (transparentBackground) {
    ctx.clearRect(0, 0, width, height);
  } else {
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);
  }

  if (backdrop && backdrop.naturalWidth > 0 && backdrop.naturalHeight > 0) {
    const fit = Math.max(width / backdrop.naturalWidth, height / backdrop.naturalHeight);
    const w = backdrop.naturalWidth * fit;
    const h = backdrop.naturalHeight * fit;
    ctx.globalAlpha = settings.backgroundOpacity;
    ctx.drawImage(backdrop, (width - w) / 2, (height - h) / 2, w, h);
    ctx.globalAlpha = 1;
  }
  if (minimalist) return;

  const haze = ctx.createRadialGradient(width * 0.5, height * 0.51, 0, width * 0.5, height * 0.51, width * 0.56);
  haze.addColorStop(0, rgba(palette.primary, 0.09 + 0.13 * pulse));
  haze.addColorStop(0.46, rgba(palette.secondary, 0.045));
  haze.addColorStop(1, 'transparent');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);
  for (const star of stars) {
    ctx.fillStyle = rgba(palette.highlight, 0.07 + 0.1 * (0.5 + 0.5 * Math.sin(time * 0.8 + star.phase)));
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.radius, 0, TAU);
    ctx.fill();
  }
  if (settings.preset === 9) return;

  const scale = Math.min(width / 8.9, height / 5.1) * settings.intensity;
  const sinYaw = Math.sin(0.12 + time * 0.085);
  const cosYaw = Math.cos(0.12 + time * 0.085);
  for (const dot of particles) {
    const { u, v, radius: r, edge, angle, seed, twinkle } = dot;
    const theta = angle + r * 0.72 + time * 0.16 + seed * 0.012;
    const petal = 0.5 + 0.5 * Math.cos(theta * 9 - r * 4.5 + time * 0.26);
    const radius = r * (2.4 + 0.32 * petal + 0.38 * pulse * settings.intensity);
    let x = Math.cos(theta) * radius;
    let y = Math.sin(theta) * radius * 0.78;
    let z = (1 - r) * 0.9 - r * r * 0.4 + Math.sin(theta * 9 - r * 5 + time * 0.43) * (0.12 + r * 0.37);

    switch (settings.preset) {
      case 1: {
        const a = angle + time * 0.18;
        const ring = 1.75 + v * 0.42 + 0.13 * Math.sin(a * 8 + time);
        x = Math.cos(a) * ring;
        y = Math.sin(a) * ring * 0.82;
        z = Math.sin(a * 3 + time * 0.3) * 0.25;
        break;
      }
      case 2:
        x = (u - 0.5) * 7.1 + Math.sin(time * 0.45 + v * 8) * 0.18;
        y = ((v + time * (0.12 + seed * 0.05)) % 1 - 0.5) * 5.3;
        z = Math.sin(u * 16 + time) * 0.32;
        break;
      case 3: {
        const side = u < 0.5 ? -1 : 1;
        const a = (u % 0.5) * TAU;
        x = side * (0.28 + v * 2.4) * Math.cos(a * 0.28);
        y = Math.sin(a) * v * 1.85;
        z = Math.cos(a * 2 + time * 0.6) * (0.22 + v * 0.65);
        break;
      }
      case 4: {
        const a = theta + r * 5 + time * 0.16;
        const arm = r * 3.1;
        x = Math.cos(a) * arm;
        y = Math.sin(a) * arm * 0.62;
        z = Math.sin(a * 3 + r * 8) * 0.35;
        break;
      }
      case 5: {
        const a = angle + time * 0.12;
        const groove = 0.55 + v * 2.3;
        x = Math.cos(a) * groove;
        y = Math.sin(a) * groove * 0.86;
        z = Math.sin(groove * 19 - time * 0.7) * 0.05;
        break;
      }
      case 6: {
        const a = angle + time * 0.18;
        const latitude = (v - 0.5) * Math.PI;
        x = Math.cos(a) * Math.cos(latitude) * 2.22;
        y = Math.sin(latitude) * 2.18;
        z = Math.sin(a) * Math.cos(latitude) * 2.22;
        break;
      }
      case 7: {
        const a = angle + r * 8 + time * 0.4;
        const ring = 0.16 + r * 3;
        x = Math.cos(a) * ring;
        y = Math.sin(a) * ring * 0.78;
        z = (1 - r) * 2.2;
        break;
      }
      case 8:
        x = (u - 0.5) * 7;
        y = (v - 0.5) * 1.8 + Math.sin(u * 14 - time * 2 + v * 4) * (0.2 + 0.65 * pulse);
        z = Math.sin(u * 20 - time) * 0.24;
        break;
    }

    z += Math.sin(theta * 16 + r * 23 - time * 0.83 + twinkle) * (0.025 + 0.055 * pulse);
    const pitchY = y * cosPitch - z * sinPitch;
    const pitchZ = y * sinPitch + z * cosPitch;
    const yawX = x * cosYaw + pitchZ * sinYaw;
    const yawZ = -x * sinYaw + pitchZ * cosYaw;
    const depth = 4.8 / (5.5 - yawZ);
    const sx = width * 0.5 + yawX * scale * depth;
    const sy = height * 0.5 + pitchY * scale * depth;
    if (sx < 0 || sx > width || sy < 0 || sy > height) continue;

    const filament = 0.5 + 0.5 * Math.sin(theta * 18 + r * 18 - time * 0.8);
    ctx.globalAlpha = Math.min(0.95, (0.17 + 0.24 * petal + 0.22 * edge + 0.15 * filament) *
      (0.58 + 0.42 * pulse) * dot.edgeFade * (1.2 + settings.glow));
    ctx.fillStyle = dot.colors[settings.palette] ?? dot.colors[0];
    const size = clamp((0.75 + 0.95 * edge + 0.4 * pulse) * depth * (width / 1320 + 0.35) * settings.particleSize, 0.55, 3.8);
    ctx.fillRect(sx, sy, size, size);
  }
  ctx.globalAlpha = 1;
}
