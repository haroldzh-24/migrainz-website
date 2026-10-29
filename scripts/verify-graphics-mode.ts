// The grey-window route list and the mount line (lib/graphics-mode.ts) that ModeSwitch uses before following a link.
// No server, database or env. scripts/verify-mode-switch.mjs checks the same list against the pages' own markers.
//   node --import tsx scripts/verify-graphics-mode.ts
import assert from 'node:assert/strict';
import { fileForPath, isGraphicsPath } from '../lib/graphics-mode';

for (const path of ['/projects', '/projects/', '/projects/blushland', '/projects/blushland/characters/x', '/projects/blushland/equipment', '/projects/blushland/equipment/fixture-scanner', '/comics', '/comics/blushland/chapter-01', '/archive']) assert.ok(isGraphicsPath(path), `${path} opens a grey window`);
for (const path of ['/', '/about', '/tracker', '/patreon', '/projectsx', '/archives', '/comicstrip']) assert.ok(!isGraphicsPath(path), `${path} stays in the terminal`);
assert.equal(fileForPath('/projects'), 'projects.db');
assert.equal(fileForPath('/projects/blushland/characters'), 'blushland.prj');
assert.equal(fileForPath('/comics'), 'comics/');
assert.equal(fileForPath('/comics/blushland/chapter-01'), 'blushland_chapter-01.cbz');
assert.equal(fileForPath('/archive'), 'archive/');
assert.equal(fileForPath('/projects/%E2%9C%93'), '✓.prj');
assert.equal(fileForPath('/projects/%E0%A4%A'), '%E0%A4%A.prj', 'a malformed escape is used as written');
console.log('PASS: grey-window route list and the file names the switch prints');
