import React from 'react';
import { LightingTheme } from '../../types';
import { LIGHTING_THEMES } from '../../constants/presets';

interface Chamber3DWallsProps {
  theme: LightingTheme;
  parallax: { x: number; y: number };
  bassIntensity: number;
}

/**
 * Chamber3DWalls builds true 3D inner chamber perspective borders (3D Inner Chamber Walls):
 * - 4 trapezoidal inner walls (Top ceiling, Bottom floor, Left & Right sidewalls)
 * - Matte dark gray / gunmetal metallic texture with directional lighting
 * - Crisp 45° corner miter lines connecting outer bezel to the recessed backboard
 * - Wall anchor mounting sockets at 9 o'clock (left wall) and 3 o'clock (right wall)
 * - Reactive perspective vanishing point that shifts with mouse movement
 * - ZERO muddy blur or black vignette halos, giving pure 8cm recessed cavity depth
 */
export const Chamber3DWalls: React.FC<Chamber3DWallsProps> = ({
  theme,
  parallax,
  bassIntensity,
}) => {
  const activeTheme = LIGHTING_THEMES[theme] || LIGHTING_THEMES.pure_white;

  // ViewBox dimensions (16:9 reference standard)
  const W = 1600;
  const H = 900;

  // 8cm perceived depth inset
  const baseDepthX = 82;
  const baseDepthY = 56;

  // Perspective vanishing point shift based on gyroscopic / mouse parallax
  const shiftX = parallax.x * 2.2;
  const shiftY = parallax.y * 1.8;

  // Inner backboard aperture coordinates
  const x0 = baseDepthX + shiftX;
  const y0 = baseDepthY + shiftY;
  const x1 = W - baseDepthX + shiftX;
  const y1 = H - baseDepthY + shiftY;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-15 overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="w-full h-full block"
      >
        <defs>
          {/* Top Ceiling Gradient: downward metallic falloff */}
          <linearGradient id="chamber-ceiling-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1c20" />
            <stop offset="25%" stopColor="#252a32" />
            <stop offset="70%" stopColor="#1e2228" />
            <stop offset="100%" stopColor="#131518" />
          </linearGradient>

          {/* Bottom Floor Gradient: upward metallic shelf falloff */}
          <linearGradient id="chamber-floor-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#141619" />
            <stop offset="35%" stopColor="#22262d" />
            <stop offset="75%" stopColor="#1a1d22" />
            <stop offset="100%" stopColor="#101214" />
          </linearGradient>

          {/* Left Wall Gradient: horizontal inward falloff */}
          <linearGradient id="chamber-left-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#17191d" />
            <stop offset="40%" stopColor="#23282f" />
            <stop offset="80%" stopColor="#1c2026" />
            <stop offset="100%" stopColor="#121417" />
          </linearGradient>

          {/* Right Wall Gradient: horizontal inward falloff */}
          <linearGradient id="chamber-right-grad" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#16181b" />
            <stop offset="40%" stopColor="#22262d" />
            <stop offset="80%" stopColor="#1b1e24" />
            <stop offset="100%" stopColor="#111316" />
          </linearGradient>

          {/* Subtle Ambient Reflected Light from Backboard theme */}
          <linearGradient id="floor-ambient-glow" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={activeTheme.ambientGlow} stopOpacity="0.12" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. TOP CEILING TRAPEZOID (机箱内腔顶壁) */}
        <polygon
          points={`0,0 ${W},0 ${x1},${y0} ${x0},${y0}`}
          fill="url(#chamber-ceiling-grad)"
        />

        {/* Subtle longitudinal brushed metal reflection on ceiling */}
        <line
          x1={x0 * 0.5}
          y1={y0 * 0.5}
          x2={W - (W - x1) * 0.5}
          y2={y0 * 0.5}
          stroke="#383f4a"
          strokeWidth="1.2"
          opacity="0.45"
        />

        {/* 2. BOTTOM FLOOR TRAPEZOID (机箱内腔底壁) */}
        <polygon
          points={`0,${H} ${W},${H} ${x1},${y1} ${x0},${y1}`}
          fill="url(#chamber-floor-grad)"
        />
        {/* Soft floor ambient bounce */}
        <polygon
          points={`0,${H} ${W},${H} ${x1},${y1} ${x0},${y1}`}
          fill="url(#floor-ambient-glow)"
        />

        {/* Clean shelf reflection hairline at bottom inner edge */}
        <line
          x1={x0}
          y1={y1}
          x2={x1}
          y2={y1}
          stroke="#47505e"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <line
          x1={0}
          y1={H - 1}
          x2={W}
          y2={H - 1}
          stroke="#2d333c"
          strokeWidth="1.2"
        />

        {/* 3. LEFT SIDEWALL TRAPEZOID (左侧金属立体内壁) */}
        <polygon
          points={`0,0 ${x0},${y0} ${x0},${y1} 0,${H}`}
          fill="url(#chamber-left-grad)"
        />

        {/* Left Wall Mounting Socket for the 9 o'clock speaker arm */}
        {/* Located at Y ~270 to align with top-left speaker */}
        <g transform={`translate(${x0 * 0.28}, 260)`}>
          {/* Socket base plate */}
          <rect
            x="0"
            y="0"
            width={x0 * 0.65}
            height="52"
            rx="3"
            fill="#181b1f"
            stroke="#343b46"
            strokeWidth="1.2"
          />
          {/* Recessed anchor slot */}
          <rect
            x={x0 * 0.15}
            y="12"
            width={x0 * 0.38}
            height="28"
            rx="2"
            fill="#0c0d0f"
            stroke="#262b33"
            strokeWidth="1"
          />
          {/* Industrial Torx hex bolt heads */}
          <circle cx={x0 * 0.34} cy="6" r="2.2" fill="#3a424e" />
          <circle cx={x0 * 0.34} cy="46" r="2.2" fill="#3a424e" />
        </g>

        {/* 4. RIGHT SIDEWALL TRAPEZOID (右侧金属立体内壁) */}
        <polygon
          points={`${W},0 ${x1},${y0} ${x1},${y1} ${W},${H}`}
          fill="url(#chamber-right-grad)"
        />

        {/* Right Wall Mounting Socket for the 3 o'clock speaker arm */}
        {/* Located at Y ~590 to align with bottom-right speaker */}
        <g transform={`translate(${W - (W - x1) * 0.93}, 580)`}>
          {/* Socket base plate */}
          <rect
            x="0"
            y="0"
            width={(W - x1) * 0.65}
            height="52"
            rx="3"
            fill="#181b1f"
            stroke="#343b46"
            strokeWidth="1.2"
          />
          {/* Recessed anchor slot */}
          <rect
            x={(W - x1) * 0.12}
            y="12"
            width={(W - x1) * 0.38}
            height="28"
            rx="2"
            fill="#0c0d0f"
            stroke="#262b33"
            strokeWidth="1"
          />
          {/* Industrial Torx hex bolt heads */}
          <circle cx={(W - x1) * 0.31} cy="6" r="2.2" fill="#3a424e" />
          <circle cx={(W - x1) * 0.31} cy="46" r="2.2" fill="#3a424e" />
        </g>

        {/* 5. FOUR 45° CORNER MITER SEAMS (清晰的三维折角边缘透视线) */}
        {/* Top-Left Miter Line */}
        <line
          x1="0"
          y1="0"
          x2={x0}
          y2={y0}
          stroke="#424a56"
          strokeWidth="1.6"
        />
        <line
          x1="0"
          y1="0"
          x2={x0}
          y2={y0}
          stroke="#687588"
          strokeWidth="0.8"
          opacity="0.6"
        />

        {/* Top-Right Miter Line */}
        <line
          x1={W}
          y1="0"
          x2={x1}
          y2={y0}
          stroke="#3b434e"
          strokeWidth="1.6"
        />
        <line
          x1={W}
          y1="0"
          x2={x1}
          y2={y0}
          stroke="#5a6575"
          strokeWidth="0.8"
          opacity="0.5"
        />

        {/* Bottom-Left Miter Line */}
        <line
          x1="0"
          y1={H}
          x2={x0}
          y2={y1}
          stroke="#343a44"
          strokeWidth="1.6"
        />
        <line
          x1="0"
          y1={H}
          x2={x0}
          y2={y1}
          stroke="#4f5968"
          strokeWidth="0.8"
          opacity="0.4"
        />

        {/* Bottom-Right Miter Line */}
        <line
          x1={W}
          y1={H}
          x2={x1}
          y2={y1}
          stroke="#343a44"
          strokeWidth="1.6"
        />
        <line
          x1={W}
          y1={H}
          x2={x1}
          y2={y1}
          stroke="#4f5968"
          strokeWidth="0.8"
          opacity="0.4"
        />

        {/* 6. INNER APERTURE FRAME BEVEL (内背板金属固定倒角框架边) */}
        {/* Highlight on top & left edges of the recessed window */}
        <polyline
          points={`${x0},${y1} ${x0},${y0} ${x1},${y0}`}
          fill="none"
          stroke="#3a424e"
          strokeWidth="1.4"
        />
        {/* Subtle shadow on bottom & right edges of the recessed window */}
        <polyline
          points={`${x1},${y0} ${x1},${y1} ${x0},${y1}`}
          fill="none"
          stroke="#101215"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
};
