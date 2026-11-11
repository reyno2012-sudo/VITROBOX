import type { CSSProperties } from 'react';

// User-supplied metal finishes. The existing graphite cabinet stays the default.
export const APPLE_METALS = {
  bronze: {
    key: 'bronze', name: '暖日落铜钛',
    previewGradient: 'linear-gradient(135deg, #fcd34d, #f97316, #78350f)',
    base: '#6b432a',
    gradientH: 'linear-gradient(90deg, #4f301d 0%, #875435 35%, #71462c 65%, #472b1a 100%)',
    gradientV: 'linear-gradient(180deg, #4f301d 0%, #875435 45%, #472b1a 100%)',
    bezelSurface: 'linear-gradient(135deg, #71462c 0%, #8c5737 35%, #5e3a24 70%, #4a2d1b 100%)',
    bezelBorder: '#6b432a', cncChamfer: 'rgba(255, 218, 185, 0.65)',
    innerShadow: 'rgba(20, 10, 5, 0.65)', solidLayer: '#653f27', knobCore: '#7a4c2e',
  },
  spaceblack: {
    key: 'spaceblack', name: '深空黑 (CNC切边)',
    previewGradient: 'linear-gradient(135deg, #45474c, #1c1d20, #0c0d0f)',
    base: '#1a1b1d',
    gradientH: 'linear-gradient(90deg, #121315 0%, #26272b 35%, #1d1e21 65%, #121315 100%)',
    gradientV: 'linear-gradient(180deg, #131416 0%, #242528 45%, #101112 100%)',
    bezelSurface: 'linear-gradient(135deg, #1e1f23 0%, #292a2e 35%, #161719 70%, #111213 100%)',
    bezelBorder: '#1a1b1d', cncChamfer: 'rgba(255, 255, 255, 0.72)',
    innerShadow: 'rgba(0, 0, 0, 0.8)', solidLayer: '#18191b', knobCore: '#26272a',
  },
  titanium: {
    key: 'titanium', name: '原色钛金属',
    previewGradient: 'linear-gradient(135deg, #c4beaf, #8c857b, #45423d)',
    base: '#524e48',
    gradientH: 'linear-gradient(90deg, #44403a 0%, #686259 35%, #565149 65%, #423e38 100%)',
    gradientV: 'linear-gradient(180deg, #44403a 0%, #686259 45%, #3d3934 100%)',
    bezelSurface: 'linear-gradient(135deg, #5b554c 0%, #666055 35%, #4a453d 70%, #3e3a33 100%)',
    bezelBorder: '#524e48', cncChamfer: 'rgba(245, 240, 230, 0.45)',
    innerShadow: 'rgba(0, 0, 0, 0.55)', solidLayer: '#4c4842', knobCore: '#5e584f',
  },
  plum: {
    key: 'plum', name: '勃艮第紫钛',
    previewGradient: 'linear-gradient(135deg, #d8b4fe, #7e22ce, #170d14)',
    base: '#3b2631',
    gradientH: 'linear-gradient(90deg, #2b1b24 0%, #4d3240 35%, #3d2733 65%, #25171f 100%)',
    gradientV: 'linear-gradient(180deg, #2b1b24 0%, #4d3240 45%, #22141b 100%)',
    bezelSurface: 'linear-gradient(135deg, #442c38 0%, #523545 35%, #33202a 70%, #261820 100%)',
    bezelBorder: '#3b2631', cncChamfer: 'rgba(243, 214, 235, 0.55)',
    innerShadow: 'rgba(12, 4, 8, 0.75)', solidLayer: '#36222c', knobCore: '#472c3b',
  },
} as const;

type ChassisMetal = typeof APPLE_METALS[keyof typeof APPLE_METALS];
export interface FrameMaterial {
  id: 'graphite' | ChassisMetal['key'];
  name: string;
  englishName: string;
  base: string;
  light: string;
  shade: string;
  edge: string;
  grain: string;
  brush: string;
  angle: string;
  metal?: ChassisMetal;
}

const METAL_LABELS = {
  bronze: 'Sunset bronze', spaceblack: 'Space black (CNC)',
  titanium: 'Natural titanium', plum: 'Burgundy titanium',
};

export const FRAME_MATERIALS: readonly FrameMaterial[] = [
  { id: 'graphite', name: '石墨黑', englishName: 'Graphite', base: '#202225', light: '#44494e', shade: '#111315', edge: '#616970', grain: '.07', brush: '.025', angle: '90deg' },
  ...Object.values(APPLE_METALS).map(metal => ({
    id: metal.key, name: metal.name, englishName: METAL_LABELS[metal.key],
    base: metal.base, light: metal.knobCore, shade: metal.solidLayer,
    edge: metal.cncChamfer, grain: '.045', brush: '.008', angle: '90deg', metal,
  })),
];

export function frameMaterialStyle(material: FrameMaterial): CSSProperties {
  return {
    '--frame-base': material.base,
    '--frame-light': material.light,
    '--frame-shade': material.shade,
    '--frame-edge': material.edge,
    '--frame-grain': material.grain,
    '--frame-brush': material.brush,
    '--frame-angle': material.angle,
    // Scope to the cabinet, so changing FRAME cannot recolor the dock or loader.
    ...(material.metal && {
      '--metal-base': material.metal.base,
      '--metal-gradient-h': material.metal.gradientH,
      '--metal-gradient-v': material.metal.gradientV,
      '--metal-bezel-surface': material.metal.bezelSurface,
      '--metal-bezel-border': material.metal.bezelBorder,
      '--metal-cnc-chamfer': material.metal.cncChamfer,
      '--metal-inner-shadow': material.metal.innerShadow,
      '--metal-solid-layer': material.metal.solidLayer,
      '--metal-knob-core': material.metal.knobCore,
    }),
  } as CSSProperties;
}
