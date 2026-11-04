import type { CSSProperties } from 'react';

// Shared by the cabinet, recessed bevels and the control's material sample.
export const FRAME_MATERIALS = [
  { id: 'graphite', name: '石墨黑', base: '#202225', light: '#44494e', shade: '#111315', edge: '#616970', grain: '.07', brush: '.025', angle: '90deg' },
  { id: 'steel', name: '拉丝不锈钢', base: '#a7afb3', light: '#f0f3f3', shade: '#535f66', edge: '#ecf3f5', grain: '.035', brush: '.16', angle: '0deg' },
  { id: 'titanium', name: '原色钛', base: '#918d84', light: '#d4d0c5', shade: '#55534e', edge: '#e0dcd1', grain: '.1', brush: '.055', angle: '90deg' },
  { id: 'aluminium', name: '喷砂铝', base: '#c4c8c9', light: '#e8ebea', shade: '#8c9498', edge: '#fafcfb', grain: '.16', brush: '.015', angle: '90deg' },
  { id: 'champagne', name: '香槟金', base: '#b7a182', light: '#eee0c6', shade: '#75634c', edge: '#f3e5cb', grain: '.05', brush: '.09', angle: '0deg' },
  { id: 'space', name: '深空钛', base: '#535d69', light: '#939eaa', shade: '#252d36', edge: '#b1bfca', grain: '.1', brush: '.065', angle: '90deg' },
] as const;

export type FrameMaterial = typeof FRAME_MATERIALS[number];

export function frameMaterialStyle(material: FrameMaterial): CSSProperties {
  return {
    '--frame-base': material.base,
    '--frame-light': material.light,
    '--frame-shade': material.shade,
    '--frame-edge': material.edge,
    '--frame-grain': material.grain,
    '--frame-brush': material.brush,
    '--frame-angle': material.angle,
  } as CSSProperties;
}
