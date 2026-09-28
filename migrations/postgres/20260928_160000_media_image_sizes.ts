import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // No defaults or backfill: existing media and versions may have no derivatives.
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "sizes_preview_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_preview_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_preview_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_preview_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_preview_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_preview_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_viewer_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_viewer_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_viewer_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_viewer_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_viewer_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_viewer_filename" varchar;

    ALTER TABLE "_media_v"
      ADD COLUMN IF NOT EXISTS "version_sizes_preview_url" varchar,
      ADD COLUMN IF NOT EXISTS "version_sizes_preview_width" numeric,
      ADD COLUMN IF NOT EXISTS "version_sizes_preview_height" numeric,
      ADD COLUMN IF NOT EXISTS "version_sizes_preview_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "version_sizes_preview_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "version_sizes_preview_filename" varchar,
      ADD COLUMN IF NOT EXISTS "version_sizes_viewer_url" varchar,
      ADD COLUMN IF NOT EXISTS "version_sizes_viewer_width" numeric,
      ADD COLUMN IF NOT EXISTS "version_sizes_viewer_height" numeric,
      ADD COLUMN IF NOT EXISTS "version_sizes_viewer_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "version_sizes_viewer_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "version_sizes_viewer_filename" varchar;

    CREATE INDEX IF NOT EXISTS "media_sizes_preview_sizes_preview_filename_idx"
      ON "media" USING btree ("sizes_preview_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_viewer_sizes_viewer_filename_idx"
      ON "media" USING btree ("sizes_viewer_filename");
    CREATE INDEX IF NOT EXISTS "_media_v_version_sizes_preview_version_sizes_preview_fil_idx"
      ON "_media_v" USING btree ("version_sizes_preview_filename");
    CREATE INDEX IF NOT EXISTS "_media_v_version_sizes_viewer_version_sizes_viewer_filen_idx"
      ON "_media_v" USING btree ("version_sizes_viewer_filename");
  `)
}

// Forward-only: retain derivative metadata if application code is rolled back.
export async function down(): Promise<void> {}
