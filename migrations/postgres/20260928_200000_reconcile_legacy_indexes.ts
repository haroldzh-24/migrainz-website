import { type MigrateUpArgs, sql } from '@payloadcms/db-postgres';

// Both historic variants are supported: the original migration renamed the
// Characters indexes; the corrected migration left them at their foundation names.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $repair$
    DECLARE
      candidate record;
      actual_table text;
      actual_columns text[];
    BEGIN
      -- Never remove old uniqueness until the replacement route keys are valid.
      IF NOT EXISTS (SELECT 1 FROM pg_index i WHERE indexrelid = to_regclass('public.factions_route_key_idx') AND indisunique AND indisvalid
        AND indrelid = 'public.factions'::regclass AND indpred IS NULL AND indexprs IS NULL AND indnatts = 1
        AND indkey[0] = (SELECT attnum FROM pg_attribute WHERE attrelid = i.indrelid AND attname = 'route_key'))
        OR NOT EXISTS (SELECT 1 FROM pg_index i WHERE indexrelid = to_regclass('public.equipment_route_key_idx') AND indisunique AND indisvalid
        AND indrelid = 'public.equipment'::regclass AND indpred IS NULL AND indexprs IS NULL AND indnatts = 1
        AND indkey[0] = (SELECT attnum FROM pg_attribute WHERE attrelid = i.indrelid AND attname = 'route_key'))
      THEN RAISE EXCEPTION 'Apply and verify the route-key repair before reconciling legacy indexes'; END IF;
      IF EXISTS (SELECT 1 FROM public.factions WHERE project_id IS NOT NULL AND slug IS NOT NULL AND route_key IS DISTINCT FROM project_id::text || '/' || slug)
        OR EXISTS (SELECT 1 FROM public.equipment WHERE project_id IS NOT NULL AND slug IS NOT NULL AND route_key IS DISTINCT FROM project_id::text || '/' || slug)
      THEN RAISE EXCEPTION 'Route keys do not match project/slug; investigate without deleting records'; END IF;

      FOR candidate IN SELECT * FROM (VALUES
        ('project_slug_idx', 'factions', ARRAY['project_id','slug']::text[]),
        ('version_project_version_slug_idx', '_factions_v', ARRAY['version_project_id','version_slug']::text[]),
        ('project_slug_2_idx', 'equipment', ARRAY['project_id','slug']::text[]),
        ('version_project_version_slug_2_idx', '_equipment_v', ARRAY['version_project_id','version_slug']::text[])
      ) AS expected(index_name, table_name, columns) LOOP
        SELECT t.relname, ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.ord)
        INTO actual_table, actual_columns
        FROM pg_index i JOIN pg_class t ON t.oid = i.indrelid
        WHERE i.indexrelid = to_regclass('public.' || candidate.index_name);
        IF actual_table = candidate.table_name AND actual_columns = candidate.columns THEN
          EXECUTE format('DROP INDEX public.%I', candidate.index_name);
        ELSIF actual_table IS NOT NULL AND NOT (
          (candidate.index_name = 'project_slug_idx' AND actual_table = 'characters' AND actual_columns = candidate.columns) OR
          (candidate.index_name = 'version_project_version_slug_idx' AND actual_table = '_characters_v' AND actual_columns = candidate.columns)
        ) THEN RAISE EXCEPTION 'Unexpected index definition for %; inspect manually', candidate.index_name;
        END IF;
      END LOOP;
    END $repair$;

    CREATE UNIQUE INDEX IF NOT EXISTS project_slug_idx ON public.characters USING btree (project_id, slug);
    CREATE INDEX IF NOT EXISTS version_project_version_slug_idx ON public._characters_v USING btree (version_project_id, version_slug);

    DO $verify$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_index WHERE indexrelid = 'public.project_slug_idx'::regclass
        AND indrelid = 'public.characters'::regclass AND indisunique AND indisvalid AND indpred IS NULL AND indexprs IS NULL)
      THEN RAISE EXCEPTION 'Characters index is not valid unconditional uniqueness; inspect manually'; END IF;
    END $verify$;

    -- The original migration's duplicate Characters indexes are harmless. Keep
    -- them rather than deleting any unknown operator-created index definition.
  `);
}

export async function down(): Promise<void> {
  throw new Error('Forward-only infrastructure repair: restore a tested backup instead of reversing production indexes.');
}
