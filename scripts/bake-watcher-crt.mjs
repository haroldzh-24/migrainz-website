// Bakes the terminal recolour and the Watcher glow into the watcher artwork, so the homepage never re-filters a moving
// container every frame. Applies the same mapping as the #crt-tune / #crt-tune-amber SVG filters in
// app/(frontend)/layout.tsx (saturate 0, then the R/G/B tables) and the glow
// drop-shadow(0 0 4px rgba(180,245,195,.7)) drop-shadow(0 0 16px rgba(120,220,150,.45)) (amber: the amber colours),
// chained the way CSS chains filters: each layer blurs the alpha of the art plus the layers before it.
//
//   node scripts/bake-watcher-crt.mjs                     green phosphor -> watcher-{base,eyes}.crt.webp
//   node scripts/bake-watcher-crt.mjs --phosphor amber    amber phosphor -> watcher-{base,eyes}.amber.webp, crt-noise.amber.png
//
// The layers are lossless WebP (the soft 16px halo makes a PNG about 475KB; lossless WebP is about 55% of that).
//
// Reads public/images/watcher/watcher-{base,eyes}.png (kept as the originals). Both outputs share one canvas, PAD px
// larger on every side, so the glow is never clipped (checked below). WatcherArt.tsx and the .watcher-art CSS offset by
// the same amount (80 of 1200), and scripts/compare-watcher-bake.mjs repeats PAD. Run it again only if the originals,
// the mapping or the glow change.
import sharp from 'sharp';
import path from 'node:path';

const dir = path.resolve('public/images/watcher');
const SIZE = 1200;
const PAD = 80;
const OUT = SIZE + PAD * 2;
// A CSS drop-shadow blur radius r is a Gaussian with sigma r/2, at display size: the art box is ~507px wide on a 1440px
// desktop, and the source is 1200px. sharp's default blur mask stops at 20% amplitude (~1.8 sigma); 0.01 keeps the
// tail out to ~3 sigma, like the browser.
const DISPLAY = 507;
const sigmaFor = radius => (radius / 2) * (SIZE / DISPLAY);
// Tables map black to --crt-bg, then --crt-dim, --crt-text, white to --crt-bright. Glow layers in CSS order.
const PHOSPHORS = {
  green: {
    suffix: 'crt',
    glow: [{ radius: 4, r: 180, g: 245, b: 195, a: 0.7 }, { radius: 16, r: 120, g: 220, b: 150, a: 0.45 }],
    table: { r: [0.039, 0.373, 0.659, 0.831], g: [0.055, 0.541, 0.847, 0.961], b: [0.043, 0.420, 0.690, 0.855] },
  },
  amber: {
    suffix: 'amber',
    glow: [{ radius: 4, r: 255, g: 210, b: 150, a: 0.7 }, { radius: 16, r: 235, g: 165, b: 75, a: 0.45 }],
    table: { r: [0.055, 0.627, 0.922, 1], g: [0.039, 0.478, 0.769, 0.878], b: [0.024, 0.282, 0.549, 0.690] },
  },
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
const save = (pixels, name) => sharp(pixels, { raw: { width: OUT, height: OUT, channels: 4 } }).webp({ lossless: true, effort: 6 }).toFile(path.join(dir, name));

const base = recolour(await read('watcher-base.png'));
const eyes = recolour(await read('watcher-eyes.png'));

// Glow source: the silhouette of head plus eyes (the eyes fill the transparent sockets, so no glow lands in them).
const union = Buffer.alloc(OUT * OUT);
for (let p = 0; p < union.length; p++) union[p] = Math.max(base[p * 4 + 3], eyes[p * 4 + 3]);
let source = Buffer.from(union); // alpha of the art plus every glow layer so far
for (const layer of GLOW) {
  const { data: blurred, info } = await sharp(source, { raw: { width: OUT, height: OUT, channels: 1 } })
    .blur({ sigma: sigmaFor(layer.radius), minAmplitude: 0.01 }).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1) throw new Error('expected a single-channel blur, got ' + info.channels);
  const next = Buffer.from(source);
  for (let p = 0; p < union.length; p++) {
    // Never under opaque art, so the moving eyes can never uncover glow inside the sockets.
    if (union[p] === 255) continue;
    const o = p * 4, a = base[o + 3] / 255, s = (blurred[p] / 255) * layer.a;
    if (a === 1 || s === 0) continue;
    // The shadow sits behind what is already there (art and earlier glow), as drop-shadow composites it.
    const outA = a + s * (1 - a);
    base[o] = Math.round((base[o] * a + layer.r * s * (1 - a)) / outA);
    base[o + 1] = Math.round((base[o + 1] * a + layer.g * s * (1 - a)) / outA);
    base[o + 2] = Math.round((base[o + 2] * a + layer.b * s * (1 - a)) / outA);
    base[o + 3] = Math.round(outA * 255);
    next[p] = Math.max(next[p], base[o + 3]);
  }
  source = next;
}
// Proof the padding is wide enough: the outermost 2px ring of the canvas must stay transparent.
let ringMax = 0;
for (let y = 0; y < OUT; y++) for (let x = 0; x < OUT; x++) {
  if (x >= 2 && y >= 2 && x < OUT - 2 && y < OUT - 2) continue;
  const o = (y * OUT + x) * 4;
  ringMax = Math.max(ringMax, base[o + 3], eyes[o + 3]);
}
if (ringMax > 2) throw new Error(`the glow reaches the canvas edge (alpha ${ringMax}/255): raise PAD`);
await save(base, `watcher-base.${suffix}.webp`);
await save(eyes, `watcher-eyes.${suffix}.webp`);
console.log(`wrote watcher-base.${suffix}.webp and watcher-eyes.${suffix}.webp (${OUT}x${OUT}, pad ${PAD}, glow sigmas ${GLOW.map(l => sigmaFor(l.radius).toFixed(2)).join(' + ')}px, edge ring alpha ${ringMax}/255)`);

// The grain tile (crt-noise.png, green-tinted by crt-noise.svg's 0.8/1/0.75 matrix) gets a matching tint per phosphor.
if (suffix !== 'crt') {
  const { data: noise, info: tile } = await sharp(path.join(dir, 'crt-noise.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tint = [GLOW[0].r / 255, GLOW[0].g / 255, GLOW[0].b / 255];
  for (let o = 0; o < noise.length; o += 4) {
    const gray = noise[o + 1]; // the green channel carries the untinted value
    for (let c = 0; c < 3; c++) noise[o + c] = Math.round(gray * tint[c]);
  }
  await sharp(noise, { raw: { width: tile.width, height: tile.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(dir, `crt-noise.${suffix}.png`));
  console.log(`wrote crt-noise.${suffix}.png`);
}
