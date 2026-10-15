import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres';

// Reviewed additive delta. Prior hand-authored access/tier/image migrations are
// already registered, so their duplicate snapshot-generated SQL is excluded.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE TABLE "characters_equipment_assignments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"equipment_id" integer,
  	"designation" varchar,
  	"quantity" numeric,
  	"notes" varchar,
  	"order" numeric
  );
  
  CREATE TABLE "_characters_v_version_equipment_assignments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"equipment_id" integer,
  	"designation" varchar,
  	"quantity" numeric,
  	"notes" varchar,
  	"order" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "equipment_technical_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "_equipment_v_version_technical_specifications" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "equipment" ADD COLUMN "manufacturer" varchar;
  ALTER TABLE "equipment" ADD COLUMN "model" varchar;
  ALTER TABLE "equipment" ADD COLUMN "equipment_type" varchar;
  ALTER TABLE "equipment" ADD COLUMN "caliber" varchar;
  ALTER TABLE "equipment" ADD COLUMN "capacity" varchar;
  ALTER TABLE "equipment" ADD COLUMN "period" varchar;
  ALTER TABLE "equipment" ADD COLUMN "schematic_enabled" boolean DEFAULT false;
  ALTER TABLE "equipment" ADD COLUMN "schematic_video_id" integer;
  ALTER TABLE "equipment" ADD COLUMN "schematic_poster_id" integer;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_manufacturer" varchar;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_model" varchar;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_equipment_type" varchar;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_caliber" varchar;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_capacity" varchar;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_period" varchar;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_schematic_enabled" boolean DEFAULT false;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_schematic_video_id" integer;
  ALTER TABLE "_equipment_v" ADD COLUMN "version_schematic_poster_id" integer;
  ALTER TABLE "characters_equipment_assignments" ADD CONSTRAINT "characters_equipment_assignments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_equipment_assignments" ADD CONSTRAINT "characters_equipment_assignments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_characters_v_version_equipment_assignments" ADD CONSTRAINT "_characters_v_version_equipment_assignments_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_characters_v_version_equipment_assignments" ADD CONSTRAINT "_characters_v_version_equipment_assignments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_characters_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "equipment_technical_specifications" ADD CONSTRAINT "equipment_technical_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_equipment_v_version_technical_specifications" ADD CONSTRAINT "_equipment_v_version_technical_specifications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_equipment_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "characters_equipment_assignments_order_idx" ON "characters_equipment_assignments" USING btree ("_order");
  CREATE INDEX "characters_equipment_assignments_parent_id_idx" ON "characters_equipment_assignments" USING btree ("_parent_id");
  CREATE INDEX "characters_equipment_assignments_equipment_idx" ON "characters_equipment_assignments" USING btree ("equipment_id");
  CREATE INDEX "_characters_v_version_equipment_assignments_order_idx" ON "_characters_v_version_equipment_assignments" USING btree ("_order");
  CREATE INDEX "_characters_v_version_equipment_assignments_parent_id_idx" ON "_characters_v_version_equipment_assignments" USING btree ("_parent_id");
  CREATE INDEX "_characters_v_version_equipment_assignments_equipment_idx" ON "_characters_v_version_equipment_assignments" USING btree ("equipment_id");
  CREATE INDEX "equipment_technical_specifications_order_idx" ON "equipment_technical_specifications" USING btree ("_order");
  CREATE INDEX "equipment_technical_specifications_parent_id_idx" ON "equipment_technical_specifications" USING btree ("_parent_id");
  CREATE INDEX "_equipment_v_version_technical_specifications_order_idx" ON "_equipment_v_version_technical_specifications" USING btree ("_order");
  CREATE INDEX "_equipment_v_version_technical_specifications_parent_id_idx" ON "_equipment_v_version_technical_specifications" USING btree ("_parent_id");
  ALTER TABLE "equipment" ADD CONSTRAINT "equipment_schematic_video_id_media_id_fk" FOREIGN KEY ("schematic_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment" ADD CONSTRAINT "equipment_schematic_poster_id_media_id_fk" FOREIGN KEY ("schematic_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_equipment_v" ADD CONSTRAINT "_equipment_v_version_schematic_video_id_media_id_fk" FOREIGN KEY ("version_schematic_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_equipment_v" ADD CONSTRAINT "_equipment_v_version_schematic_poster_id_media_id_fk" FOREIGN KEY ("version_schematic_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "equipment_schematic_video_idx" ON "equipment" USING btree ("schematic_video_id");
  CREATE INDEX "equipment_schematic_poster_idx" ON "equipment" USING btree ("schematic_poster_id");
  CREATE INDEX "_equipment_v_version_version_schematic_video_idx" ON "_equipment_v" USING btree ("version_schematic_video_id");
  CREATE INDEX "_equipment_v_version_version_schematic_poster_idx" ON "_equipment_v" USING btree ("version_schematic_poster_id");`);
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('This content-preserving migration has no automatic down. Restore a reviewed database backup to roll back.');
}
