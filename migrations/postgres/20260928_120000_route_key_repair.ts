import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $migration$
    BEGIN
      IF to_regclass('public.factions') IS NOT NULL THEN
        ALTER TABLE public.factions ADD COLUMN IF NOT EXISTS "route_key" varchar;
        UPDATE public.factions
        SET "route_key" = "project_id"::text || '/' || "slug"
        WHERE "project_id" IS NOT NULL AND "slug" IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "factions_route_key_idx"
          ON public.factions USING btree ("route_key");
      END IF;

      IF to_regclass('public._factions_v') IS NOT NULL THEN
        ALTER TABLE public."_factions_v" ADD COLUMN IF NOT EXISTS "version_route_key" varchar;
        UPDATE public."_factions_v"
        SET "version_route_key" = "version_project_id"::text || '/' || "version_slug"
        WHERE "version_project_id" IS NOT NULL AND "version_slug" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "_factions_v_version_version_route_key_idx"
          ON public."_factions_v" USING btree ("version_route_key");
      END IF;

      IF to_regclass('public.equipment') IS NOT NULL THEN
        ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS "route_key" varchar;
        UPDATE public.equipment
        SET "route_key" = "project_id"::text || '/' || "slug"
        WHERE "project_id" IS NOT NULL AND "slug" IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "equipment_route_key_idx"
          ON public.equipment USING btree ("route_key");
      END IF;

      IF to_regclass('public._equipment_v') IS NOT NULL THEN
        ALTER TABLE public."_equipment_v" ADD COLUMN IF NOT EXISTS "version_route_key" varchar;
        UPDATE public."_equipment_v"
        SET "version_route_key" = "version_project_id"::text || '/' || "version_slug"
        WHERE "version_project_id" IS NOT NULL AND "version_slug" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "_equipment_v_version_version_route_key_idx"
          ON public."_equipment_v" USING btree ("version_route_key");
      END IF;
    END
    $migration$;
  `)
}

export async function down(): Promise<void> {}