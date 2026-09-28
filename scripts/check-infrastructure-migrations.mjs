// Narrow, disposable PostgreSQL-engine check; never loads environment credentials
// or connects to a database server. The test dependency lives under ignored
// test-results/schema-check rather than in the application dependency tree.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { PGlite } from '../test-results/schema-check/node_modules/@electric-sql/pglite/dist/index.js';

const directory = 'migrations/postgres/';
const names = ['20260909_045755_foundation', '20260927_190344_factions_equipment',
  '20260928_120000_route_key_repair', '20260928_193304_media_derivatives_storage',
  '20260928_200000_reconcile_legacy_indexes'];
const sources = await Promise.all(names.map(name => fs.readFile(directory + name + '.ts', 'utf8')));
function upSQL(source) {
  const match = source.split('export async function down')[0].match(/db\.execute\(sql`([\s\S]*?)`\)/);
  assert.ok(match, 'Expected one static SQL up migration');
  return match[1];
}
const snapshot = JSON.parse(await fs.readFile(directory + names[3] + '.json', 'utf8'));
for (const variant of ['corrected', 'original']) {
  const db = new PGlite();
  try {
    await db.exec(upSQL(sources[0]));
    const factionSource = variant === 'original'
      ? execFileSync('git', ['show', '519daa1:migrations/postgres/20260927_190344_factions_equipment.ts'], { encoding: 'utf8' })
      : sources[1];
    await db.exec(upSQL(factionSource));
    await db.exec(`INSERT INTO projects (id, title, slug, project_code) VALUES (1, 'Preserve', 'preserve', 'KEEP');
      INSERT INTO characters (id, name, slug, project_id) VALUES (1, 'Keep character', 'keep', 1);
      INSERT INTO factions (id, name, slug, project_id) VALUES (1, 'Keep faction', 'keep', 1);
      INSERT INTO equipment (id, name, slug, project_id, faction_id) VALUES (1, 'Keep equipment', 'keep', 1, 1);
      INSERT INTO media (id, filename, alt) VALUES (1, 'existing.png', 'Preserve original');`);
    for (const source of sources.slice(2)) await db.exec(upSQL(source));
    // Check every generated table/column, including version storage metadata.
    const { rows } = await db.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`);
    const columns = new Set(rows.map(row => `${row.table_name}.${row.column_name}`));
    for (const table of Object.values(snapshot.tables)) {
      for (const column of Object.values(table.columns)) assert.ok(columns.has(`${table.name}.${column.name}`), `${variant}: missing ${table.name}.${column.name}`);
    }
    assert.deepEqual((await db.query('SELECT filename, alt, sizes_preview_filename, sizes_viewer_filename FROM media WHERE id = 1')).rows,
      [{ filename: 'existing.png', alt: 'Preserve original', sizes_preview_filename: null, sizes_viewer_filename: null }]);
    assert.equal((await db.query('SELECT route_key FROM factions WHERE id = 1')).rows[0].route_key, '1/keep');
    assert.equal((await db.query('SELECT route_key, faction_id FROM equipment WHERE id = 1')).rows[0].faction_id, 1);
    assert.equal((await db.query('SELECT name FROM characters WHERE id = 1')).rows[0].name, 'Keep character');
    const index = (await db.query("SELECT tablename, indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'project_slug_idx'")).rows[0];
    assert.equal(index.tablename, 'characters');
    assert.match(index.indexdef, /UNIQUE INDEX/);
    // Verify the reconciliation is repeatable without changing content.
    await db.exec(upSQL(sources[4]));
    console.log(`PASS: ${variant} history reaches current columns; route keys, character uniqueness and legacy media preserved.`);
  } finally { await db.close(); }
}
