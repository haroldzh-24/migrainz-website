// Text-mode graphics for the homepage (design canvas board 23): everything is drawn with characters on a monospace grid.
// Pure functions, no DOM, so scripts can check their output directly.
import { isLand } from './land-mask';

/** Density ramp from empty to full, used for the Watcher lens and the globe's shading. */
export const RAMP = ' .:-=+*cxbXA#';
/** Characters a decoding title shows before it settles. */
export const GLYPHS = '#%&*+=<>/\\|_-01ABCDEFHKMNRSXZ';
/** IBM Plex Mono at 12px: 7.2px wide (600/1000 em), set at a 12px line height. */
export const CELL_W = 7.2;
export const CELL_H = 12;
const ASPECT = CELL_W / CELL_H;

/** NODE 01's pin: central Texas. */
export const NODE_LAT = 31;
export const NODE_LON = -99;

function hash(x: number, y: number, s: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Sparse dots that re-scatter at each step: the "little static" behind the Watcher. Only dots and spaces. */
export function renderStatic(cols: number, rows: number, step: number, density = 0.008): string {
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) line += hash(x, y, step) < density ? '.' : ' ';
    out.push(line);
  }
  return out.join('\n');
}

/** Characters with random glyphs in place of the not-yet-decoded part (spaces and line breaks stay). */
export function noise(text: string, random: () => number = Math.random): string {
  let out = '';
  for (const c of text) out += c === ' ' || c === '\n' ? c : GLYPHS[Math.floor(random() * GLYPHS.length)];
  return out;
}

export type Globe = { text: string; pin: { col: number; row: number; visible: boolean }; centerLon: number };

/**
 * An orthographic text globe of the real world (land shaded by how much it faces the viewer, ocean empty, a dotted rim
 * and sparse ocean graticule dots). The view swings slowly back and forth over the Americas, so NODE 01 in Texas stays
 * on the visible side. `time` is in milliseconds; `swing` false keeps the view still (reduced motion).
 */
export function renderGlobe(cols: number, rows: number, time: number, swing = true): Globe {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const radius = Math.min(rows / 2 - 0.6, (cols / 2 - 1) * ASPECT);
  const lat0 = 20 * Math.PI / 180;
  const centerLon = NODE_LON + (swing ? 70 * Math.sin(time * 2 * Math.PI / 48000) : 0);
  const lon0 = centerLon * Math.PI / 180;
  const sinLat0 = Math.sin(lat0), cosLat0 = Math.cos(lat0);
  const shades = '.:-=+*#';
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const u = (x - cx) * ASPECT / radius;
      const v = -(y - cy) / radius;
      const rho = Math.hypot(u, v);
      if (rho > 1) { line += Math.abs(rho - 1) < 0.07 ? '.' : ' '; continue; }
      const c = Math.asin(Math.min(1, rho));
      const sinC = Math.sin(c), cosC = Math.cos(c);
      const lat = rho === 0 ? lat0 : Math.asin(cosC * sinLat0 + v * sinC * cosLat0 / rho);
      const lon = lon0 + Math.atan2(u * sinC, rho * cosC * cosLat0 - v * sinC * sinLat0);
      const latDeg = lat * 180 / Math.PI, lonDeg = lon * 180 / Math.PI;
      if (isLand(latDeg, lonDeg)) line += shades[Math.min(shades.length - 1, 1 + Math.floor(cosC * (shades.length - 1)))];
      else {
        const nearLat = Math.abs(latDeg / 30 - Math.round(latDeg / 30)) < 0.06;
        const nearLon = Math.abs(lonDeg / 30 - Math.round(lonDeg / 30)) < 0.05;
        line += nearLat && nearLon ? '.' : ' ';
      }
    }
    out.push(line);
  }
  const phi = NODE_LAT * Math.PI / 180, dl = NODE_LON * Math.PI / 180 - lon0;
  const px = Math.cos(phi) * Math.sin(dl);
  const py = cosLat0 * Math.sin(phi) - sinLat0 * Math.cos(phi) * Math.cos(dl);
  const facing = sinLat0 * Math.sin(phi) + cosLat0 * Math.cos(phi) * Math.cos(dl);
  return { text: out.join('\n'), pin: { col: cx + px * radius / ASPECT, row: cy - py * radius, visible: facing > 0.08 }, centerLon };
}

/** Image pixels (RGBA, cols x rows) to characters by brightness; transparent or near-black pixels become spaces. */
export function imageToText(data: Uint8ClampedArray | number[], cols: number, rows: number): string[] {
  const lines: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const alpha = data[i + 3] / 255;
      const lum = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255 * alpha;
      line += alpha < 0.15 || lum < 0.05 ? ' ' : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor(lum * (RAMP.length - 1) * 1.25))];
    }
    lines.push(line);
  }
  return lines;
}

/** "left ...... right" padded with dots to a fixed width, for the directory previews. */
export function dotted(left: string, right: string, width = 34): string {
  const room = width - left.length - right.length - 2;
  return room < 2 ? `${left} ${right}` : `${left} ${'.'.repeat(room)} ${right}`;
}
