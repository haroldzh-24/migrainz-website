import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "prefix" varchar DEFAULT '';
  ALTER TABLE "media" ADD COLUMN "sizes_preview_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_preview_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_preview_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_preview_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_preview_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_preview_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_viewer_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_viewer_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_viewer_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_viewer_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_viewer_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_viewer_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_prefix" varchar DEFAULT '';
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_preview_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_preview_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_preview_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_preview_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_preview_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_preview_filename" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_viewer_url" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_viewer_width" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_viewer_height" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_viewer_mime_type" varchar;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_viewer_filesize" numeric;
  ALTER TABLE "_media_v" ADD COLUMN "version_sizes_viewer_filename" varchar;
  CREATE INDEX "media_sizes_preview_sizes_preview_filename_idx" ON "media" USING btree ("sizes_preview_filename");
  CREATE INDEX "media_sizes_viewer_sizes_viewer_filename_idx" ON "media" USING btree ("sizes_viewer_filename");
  CREATE INDEX "_media_v_version_sizes_preview_version_sizes_preview_fil_idx" ON "_media_v" USING btree ("version_sizes_preview_filename");
  CREATE INDEX "_media_v_version_sizes_viewer_version_sizes_viewer_filen_idx" ON "_media_v" USING btree ("version_sizes_viewer_filename");`)
}

// Retain nullable metadata and object keys on application rollback.
export async function down(): Promise<void> {
  throw new Error('Forward-only media migration: restore a tested backup instead of dropping stored media metadata.');
}
