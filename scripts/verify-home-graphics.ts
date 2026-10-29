// Homepage text graphics (lib/home/land-mask.ts, lib/home/text-graphics.ts). No server, database or env.
//   node --import tsx scripts/verify-home-graphics.ts
import assert from 'node:assert/strict';
import { LAND_H, LAND_W, isLand } from '../lib/home/land-mask';
import { NODE_LAT, NODE_LON, RAMP, dotted, imageToText, renderGlobe, renderStatic } from '../lib/home/text-graphics';

// The land mask is the real world: a few known places, both hemispheres, and the date line wraps.
assert.equal(LAND_W, 144);
assert.equal(LAND_H, 72);
for (const [name, lat, lon] of [['Texas', 31, -99], ['Brazil', -10, -55], ['Sahara', 23, 10], ['Siberia', 62, 100], ['Australia', -25, 134]] as const) assert.ok(isLand(lat, lon), `${name} is land`);
for (const [name, lat, lon] of [['mid Pacific', 0, -150], ['mid Atlantic', 30, -40], ['Indian Ocean', -30, 80], ['Gulf of Mexico', 25, -90]] as const) assert.ok(!isLand(lat, lon), `${name} is sea`);
assert.equal(isLand(31, -99), isLand(31, 261), 'longitude wraps');
console.log('PASS: land mask (known land and sea, longitude wraps)');

// NODE 01 sits on Texas, and the globe draws it on land when Texas faces the viewer.
assert.deepEqual([NODE_LAT, NODE_LON], [31, -99]);
const still = renderGlobe(34, 21, 0, false);
assert.equal(still.centerLon, -99, 'unswung globe faces Texas');
assert.ok(still.pin.visible, 'pin visible when Texas faces the viewer');
const rows = still.text.split('\n');
assert.equal(rows.length, 21);
assert.ok(rows.every(row => row.length === 34), 'every globe row is 34 cells');
const under = rows[Math.round(still.pin.row)][Math.round(still.pin.col)];
assert.match(under, /[-:=+*#]/, `pin lands on a land cell (found ${JSON.stringify(under)})`);
// Swinging: the view stays within 70 degrees of Texas, so the pin stays on the visible side.
for (let time = 0; time < 48000; time += 4000) {
  const globe = renderGlobe(34, 21, time);
  assert.ok(Math.abs(globe.centerLon - NODE_LON) <= 70.0001, 'swing stays within 70 degrees');
  assert.ok(globe.pin.visible, `pin visible at ${time} ms`);
}
console.log('PASS: globe (34 x 21, NODE 01 drawn on land over Texas, swing within 70 degrees)');

// Static is dots and spaces only, at the requested size, and sparse.
const noise = renderStatic(60, 30, 0);
const lines = noise.split('\n');
assert.equal(lines.length, 30);
assert.ok(lines.every(line => line.length === 60));
assert.match(noise, /^[ .\n]+$/);
const dots = noise.split('.').length - 1;
assert.ok(dots > 0 && dots < 60 * 30 * 0.05, `static is sparse (${dots} dots)`);
console.log('PASS: static (dots only, sized, sparse)');

// Image to text: black and transparent pixels are spaces, bright pixels use the dense end of the ramp.
const pixels = [0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 0, 128, 128, 128, 255];
const text = imageToText(pixels, 4, 1)[0];
assert.equal(text[0], ' ');
assert.equal(text[1], RAMP[RAMP.length - 1]);
assert.equal(text[2], ' ');
assert.ok(RAMP.indexOf(text[3]) > 0 && RAMP.indexOf(text[3]) < RAMP.length - 1);
assert.equal(dotted('A', 'B', 10), 'A ...... B');
assert.equal(dotted('LONG LEFT', 'RIGHT', 10), 'LONG LEFT RIGHT');
console.log('PASS: image to text and dotted rows');
