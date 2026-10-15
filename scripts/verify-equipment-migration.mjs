// In-memory PostgreSQL only. PGLITE_MODULE may point at a temporary installation.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { PgDialect } from 'drizzle-orm/pg-core';
import { migrations } from '../migrations/postgres/index.ts';
const modulePath = process.env.PGLITE_MODULE || 'test-results/schema-check/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(path.resolve(modulePath)).href);
const pg = new PGlite();
const dialect = new PgDialect();
const db = { execute: query => pg.exec(dialect.sqlToQuery(query).sql) };
try {
  for (const migration of migrations.slice(0, -1)) await migration.up({ db });
  await pg.exec(`INSERT INTO projects (id, title, slug, project_code, status) VALUES (1,'Preserved project','preserved','P','ACTIVE');
    INSERT INTO equipment (id, name, slug, project_id) VALUES (1,'Preserved equipment','preserved',1);
    INSERT INTO characters (id, name, slug, project_id) VALUES (1,'Preserved character','preserved',1);`);
  const before = (await pg.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY 1,2`)).rows;
  await migrations.at(-1).up({ db });
  const after = new Set((await pg.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`)).rows.map(row => `${row.table_name}.${row.column_name}`));
  for (const row of before) assert(after.has(`${row.table_name}.${row.column_name}`));
  assert.equal((await pg.query('SELECT name FROM equipment WHERE id=1')).rows[0].name, 'Preserved equipment');
  assert.equal((await pg.query('SELECT name FROM characters WHERE id=1')).rows[0].name, 'Preserved character');
  assert.equal((await pg.query('SELECT schematic_enabled FROM equipment WHERE id=1')).rows[0].schematic_enabled, false);
  for (const table of ['characters_equipment_assignments', '_characters_v_version_equipment_assignments', 'equipment_technical_specifications', '_equipment_v_version_technical_specifications']) {
    assert.equal((await pg.query(`SELECT count(*) AS count FROM "${table}"`)).rows[0].count, 0);
  }
  await pg.exec(`INSERT INTO characters_equipment_assignments (_order,_parent_id,id,equipment_id,designation,quantity) VALUES (1,1,'assignment',1,'Personal',2);
    INSERT INTO equipment_technical_specifications (_order,_parent_id,id,label,value) VALUES (1,1,'spec','Mass','1kg');`);
  await assert.rejects(pg.exec(`INSERT INTO characters_equipment_assignments (_order,_parent_id,id,equipment_id) VALUES (2,1,'invalid',999)`));
  console.log('PASS: complete registered PostgreSQL migration chain in memory; existing columns/records preserved; live/version arrays; defaults; relationship foreign keys.');
} finally { await pg.close(); }
