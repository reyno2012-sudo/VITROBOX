import React from 'react';
import { LightingTheme } from '../../types';

interface OuterGlassPaneProps {
  parallax: { x: number; y: number };
  theme: LightingTheme;
  bassIntensity?: number;
  sheen?: number;
}

/**
 * OuterGlassPane models the front optical crystal windshield glass panel:
 * - Top layer covered with ultra-clean diagonal optical sheen:
 *   linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(255,255,255,0.03) 100%)
 * - Subtle tempered glass edge bevel highlight
 * - Crystal-clear zero-distortion transparency
 */
export const OuterGlassPane: React.FC<OuterGlassPaneProps> = ({
  parallax,
  theme,
  bassIntensity = 0,
  sheen = 0.48,
}) => {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-md select-none"
      style={{
        transform: 'translateZ(68px)',
        transformStyle: 'preserve-3d',
        opacity: sheen,
      }}
    >
      {/* 1. Requested Optical Tempered Glass Sheen Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,.28) 0%, rgba(255,255,255,.04) 24%, transparent 24.5% 46%, rgba(255,255,255,.10) 46.5%, transparent 57%, rgba(255,255,255,.12) 100%)',
        }}
      />

      {/* 2. Precision Front Edge Chamfer Reflection (Fine crystalline border) */}
      <div
        className="absolute inset-0 rounded-md border border-white/25 pointer-events-none"
        style={{
          boxShadow:
            'inset 0 1.5px 2px rgba(255, 255, 255, 0.45), inset 1px 0 1.5px rgba(255, 255, 255, 0.25), inset 0 -1.5px 2px rgba(0, 0, 0, 0.6)',
        }}
      />

      {/* 3. Subtle Low-Iron Glass Perimeter Refraction Tint */}
      <div
        className="absolute inset-0 rounded-md pointer-events-none opacity-20"
        style={{
          boxShadow: 'inset 0 0 6px rgba(56, 189, 248, 0.25)',
        }}
      />

      {/* 4. Top-Left Delicate Glass Corner Specular Glint */}
      <div
        className="absolute top-0 left-0 w-28 h-28 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.15) 30%, transparent 70%)',
        }}
      />
    </div>
  );
};
