import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_projects_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_projects_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__projects_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__projects_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_factions_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_factions_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__factions_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__factions_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_characters_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_characters_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__characters_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__characters_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_equipment_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_equipment_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__equipment_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__equipment_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_comics_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_comics_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__comics_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__comics_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_chapters_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_chapters_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__chapters_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__chapters_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_project_updates_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_project_updates_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__project_updates_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__project_updates_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_tracker_items_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_tracker_items_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__tracker_items_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__tracker_items_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_galleries_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_galleries_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__galleries_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__galleries_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_archive_items_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_archive_items_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__archive_items_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__archive_items_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum_media_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum_media_access_level" ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE "public"."enum__media_v_version_access_level" ADD VALUE IF NOT EXISTS 'redacted';
    ALTER TYPE "public"."enum__media_v_version_access_level" ADD VALUE IF NOT EXISTS 'hidden';
  `)
}

// Additive enum values only; retain existing classifications on rollback.
export async function down(): Promise<void> {}
