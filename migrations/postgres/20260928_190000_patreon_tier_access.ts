import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_projects_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "factions" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_factions_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_characters_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "equipment" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_equipment_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "comics" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_comics_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "chapters" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_chapters_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "project_updates" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_project_updates_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "tracker_items" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_tracker_items_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "galleries" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_galleries_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "archive_items" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_archive_items_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "patreon_tier_i_ds" jsonb;
    ALTER TABLE "_media_v" ADD COLUMN IF NOT EXISTS "version_patreon_tier_i_ds" jsonb;
  `)
}

// Keep tier requirements on rollback; removing them could broaden access.
export async function down(): Promise<void> {}
