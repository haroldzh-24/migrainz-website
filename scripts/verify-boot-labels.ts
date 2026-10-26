// Boot checklist names (lib/content/boot-labels.ts). No server, database or env.
//   node --import tsx scripts/verify-boot-labels.ts
import assert from 'node:assert/strict';
import { fileName, phaseLabel } from '../lib/content/boot-labels';

// The live tracker titles its phase with the project name; it must not print blushland_blushland_ch1.
assert.equal(phaseLabel('blushland', 'BLUSHLAND CH1'), 'blushland_ch1');
assert.equal(phaseLabel('blushland', 'blushland'), 'blushland');
assert.equal(phaseLabel('blushland', 'CHAPTER 02'), 'blushland_chapter_02');
// Only a whole leading word counts as the project name.
assert.equal(phaseLabel('blushland', 'Blushlandia'), 'blushland_blushlandia');
assert.equal(phaseLabel('rat-city-blues', 'Rat City Blues ch 1'), 'rat_city_blues_ch_1');
assert.equal(phaseLabel(undefined, 'Script'), 'script');
assert.equal(fileName('!!!'), 'file');
assert.equal(fileName('A very long phase title that keeps going').length, 28);
// A cut that lands right after a separator must not leave a trailing underscore.
assert.equal(phaseLabel('blushland', 'Blushland chapter two final cut'), 'blushland_chapter_two_final');
assert.ok(!/^_|_$/.test(fileName('Twenty eight characters ok! and more')));
console.log('PASS: boot checklist labels (no doubled project slug, whole-word match, fallbacks, 28-character cap, no trailing separator).');
