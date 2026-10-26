// Bakes the terminal recolour into the watcher artwork so the homepage no longer re-filters a moving container
// every frame. Applies the same mapping as the #crt-tune SVG filter in app/(frontend)/layout.tsx (saturate 0, then
// the R/G/B tables) and the soft glow drop-shadow(0 0 4px rgba(180,245,195,.35)) to the head silhouette.
//
//   node scripts/bake-watcher-crt.mjs                     green phosphor (#crt-tune)       -> watcher-{base,eyes}.crt.png
//   node scripts/bake-watcher-crt.mjs --phosphor amber    amber phosphor (#crt-tune-amber) -> watcher-{base,eyes}.amber.png
//
// Reads public/images/watcher/watcher-{base,eyes}.png (kept as the originals).
// Both outputs share one canvas, PAD px larger on every side, so the glow is not clipped; WatcherArt.tsx offsets by
// the same amount so the geometry is unchanged. Run it again only if the originals or the mapping change.
import sharp from 'sharp';
import path from 'node:path';

const dir = path.resolve('public/images/watcher');
const SIZE = 1200;
export const PAD = 24;
const OUT = SIZE + PAD * 2;
// The CSS drop-shadow blur radius is 4px (sigma 2px) on a ~507px wide art box (1440px desktop); the source is 1200px.
const GLOW_SIGMA = 2 * (SIZE / 507);
// Tables map black to --crt-bg, then --crt-dim, --crt-text, white to --crt-bright; the glow matches --crt-glow-filter.
const PHOSPHORS = {
  green: { suffix: 'crt', glow: { r: 180, g: 245, b: 195, a: 0.35 }, table: { r: [0.039, 0.373, 0.659, 0.831], g: [0.055, 0.541, 0.847, 0.961], b: [0.043, 0.420, 0.690, 0.855] } },
  amber: { suffix: 'amber', glow: { r: 255, g: 210, b: 150, a: 0.35 }, table: { r: [0.055, 0.627, 0.922, 1], g: [0.039, 0.478, 0.769, 0.878], b: [0.024, 0.282, 0.549, 0.690] } },
};
const flag = process.argv.indexOf('--phosphor');
const phosphor = PHOSPHORS[flag === -1 ? 'green' : process.argv[flag + 1]];
if (!phosphor) throw new Error('--phosphor must be one of: ' + Object.keys(PHOSPHORS).join(', '));
const { glow: GLOW, table: TABLE, suffix } = phosphor;

const table = (values, c) => {
  const scaled = c * (values.length - 1), k = Math.min(values.length - 2, Math.floor(scaled));
  return values[k] + (scaled - k) * (values[k + 1] - values[k]);
};
const read = async name => {
  const { data } = await sharp(path.join(dir, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return data;
};
// Recolour into a padded RGBA canvas (straight alpha), as feColorMatrix + feComponentTransfer do.
function recolour(source) {
  const out = Buffer.alloc(OUT * OUT * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4, o = ((y + PAD) * OUT + x + PAD) * 4;
    const gray = (0.213 * source[i] + 0.715 * source[i + 1] + 0.072 * source[i + 2]) / 255;
    out[o] = Math.round(table(TABLE.r, gray) * 255);
    out[o + 1] = Math.round(table(TABLE.g, gray) * 255);
    out[o + 2] = Math.round(table(TABLE.b, gray) * 255);
    out[o + 3] = source[i + 3];
  }
  return out;
}
const save = (pixels, name) => sharp(pixels, { raw: { width: OUT, height: OUT, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(dir, name));

const base = recolour(await read('watcher-base.png'));
const eyes = recolour(await read('watcher-eyes.png'));

// Glow from the silhouette of head plus eyes (the eyes fill the transparent sockets, so no glow lands in them).
const union = Buffer.alloc(OUT * OUT);
for (let p = 0; p < union.length; p++) union[p] = Math.max(base[p * 4 + 3], eyes[p * 4 + 3]);
const { data: blurred, info } = await sharp(union, { raw: { width: OUT, height: OUT, channels: 1 } }).blur(GLOW_SIGMA).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 1) throw new Error('expected a single-channel blur, got ' + info.channels);
for (let p = 0; p < union.length; p++) {
  const o = p * 4, a = base[o + 3] / 255;
  const s = union[p] === 255 ? 0 : (blurred[p] / 255) * GLOW.a; // shadow only outside the silhouette
  if (a === 1 || s === 0) continue;
  const outA = a + s * (1 - a);
  base[o] = Math.round((base[o] * a + GLOW.r * s * (1 - a)) / outA);
  base[o + 1] = Math.round((base[o + 1] * a + GLOW.g * s * (1 - a)) / outA);
  base[o + 2] = Math.round((base[o + 2] * a + GLOW.b * s * (1 - a)) / outA);
  base[o + 3] = Math.round(outA * 255);
}
await save(base, `watcher-base.${suffix}.png`);
await save(eyes, `watcher-eyes.${suffix}.png`);
console.log(`wrote watcher-base.${suffix}.png and watcher-eyes.${suffix}.png (${OUT}x${OUT}, pad ${PAD}, glow sigma ${GLOW_SIGMA.toFixed(2)}px)`);

// The grain tile (crt-noise.png, green-tinted by crt-noise.svg's 0.8/1/0.75 matrix) gets a matching tint per phosphor.
if (suffix !== 'crt') {
  const { data: noise, info: tile } = await sharp(path.join(dir, 'crt-noise.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tint = [GLOW.r / 255, GLOW.g / 255, GLOW.b / 255];
  for (let o = 0; o < noise.length; o += 4) {
    const gray = noise[o + 1]; // the green channel carries the untinted value
    for (let c = 0; c < 3; c++) noise[o + c] = Math.round(gray * tint[c]);
  }
  await sharp(noise, { raw: { width: tile.width, height: tile.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(dir, `crt-noise.${suffix}.png`));
  console.log(`wrote crt-noise.${suffix}.png`);
}
