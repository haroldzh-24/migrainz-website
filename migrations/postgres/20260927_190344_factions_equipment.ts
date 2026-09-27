import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_factions_type" AS ENUM('Faction', 'Organization', 'Association', 'Military Unit', 'Corporation', 'Government', 'Group', 'Other');
  CREATE TYPE "public"."enum_factions_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_factions_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_factions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__factions_v_version_type" AS ENUM('Faction', 'Organization', 'Association', 'Military Unit', 'Corporation', 'Government', 'Group', 'Other');
  CREATE TYPE "public"."enum__factions_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__factions_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__factions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_equipment_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_equipment_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_equipment_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__equipment_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__equipment_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__equipment_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "factions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"project_id" integer,
  	"type" "enum_factions_type" DEFAULT 'Faction',
  	"status" varchar,
  	"description" varchar,
  	"writing" jsonb,
  	"emblem_id" integer,
  	"order" numeric DEFAULT 0,
  	"listing_visibility" "enum_factions_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_factions_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_factions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_factions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_project_id" integer,
  	"version_type" "enum__factions_v_version_type" DEFAULT 'Faction',
  	"version_status" varchar,
  	"version_description" varchar,
  	"version_writing" jsonb,
  	"version_emblem_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_listing_visibility" "enum__factions_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__factions_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__factions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "equipment_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "equipment" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"project_id" integer,
  	"faction_id" integer,
  	"category" varchar,
  	"description" varchar,
  	"order" numeric DEFAULT 0,
  	"listing_visibility" "enum_equipment_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_equipment_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_equipment_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_equipment_v_version_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_equipment_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_project_id" integer,
  	"version_faction_id" integer,
  	"version_category" varchar,
  	"version_description" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_listing_visibility" "enum__equipment_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__equipment_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__equipment_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  DROP INDEX "project_slug_idx";
  DROP INDEX "version_project_version_slug_idx";
  ALTER TABLE "characters" ADD COLUMN "primary_faction_id" integer;
  ALTER TABLE "characters_rels" ADD COLUMN "factions_id" integer;
  ALTER TABLE "_characters_v" ADD COLUMN "version_primary_faction_id" integer;
  ALTER TABLE "_characters_v_rels" ADD COLUMN "factions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "factions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "equipment_id" integer;
  ALTER TABLE "factions" ADD CONSTRAINT "factions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "factions" ADD CONSTRAINT "factions_emblem_id_media_id_fk" FOREIGN KEY ("emblem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_factions_v" ADD CONSTRAINT "_factions_v_parent_id_factions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_factions_v" ADD CONSTRAINT "_factions_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_factions_v" ADD CONSTRAINT "_factions_v_version_emblem_id_media_id_fk" FOREIGN KEY ("version_emblem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_images" ADD CONSTRAINT "equipment_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment_images" ADD CONSTRAINT "equipment_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "equipment" ADD CONSTRAINT "equipment_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipment" ADD CONSTRAINT "equipment_faction_id_factions_id_fk" FOREIGN KEY ("faction_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_equipment_v_version_images" ADD CONSTRAINT "_equipment_v_version_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_equipment_v_version_images" ADD CONSTRAINT "_equipment_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_equipment_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_equipment_v" ADD CONSTRAINT "_equipment_v_parent_id_equipment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."equipment"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_equipment_v" ADD CONSTRAINT "_equipment_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_equipment_v" ADD CONSTRAINT "_equipment_v_version_faction_id_factions_id_fk" FOREIGN KEY ("version_faction_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "factions_slug_idx" ON "factions" USING btree ("slug");
  CREATE INDEX "factions_project_idx" ON "factions" USING btree ("project_id");
  CREATE INDEX "factions_emblem_idx" ON "factions" USING btree ("emblem_id");
  CREATE UNIQUE INDEX "factions_legacy_key_idx" ON "factions" USING btree ("legacy_key");
  CREATE INDEX "factions_updated_at_idx" ON "factions" USING btree ("updated_at");
  CREATE INDEX "factions_created_at_idx" ON "factions" USING btree ("created_at");
  CREATE INDEX "factions__status_idx" ON "factions" USING btree ("_status");
  CREATE UNIQUE INDEX "project_slug_idx" ON "factions" USING btree ("project_id","slug");
  CREATE INDEX "_factions_v_parent_idx" ON "_factions_v" USING btree ("parent_id");
  CREATE INDEX "_factions_v_version_version_slug_idx" ON "_factions_v" USING btree ("version_slug");
  CREATE INDEX "_factions_v_version_version_project_idx" ON "_factions_v" USING btree ("version_project_id");
  CREATE INDEX "_factions_v_version_version_emblem_idx" ON "_factions_v" USING btree ("version_emblem_id");
  CREATE INDEX "_factions_v_version_version_legacy_key_idx" ON "_factions_v" USING btree ("version_legacy_key");
  CREATE INDEX "_factions_v_version_version_updated_at_idx" ON "_factions_v" USING btree ("version_updated_at");
  CREATE INDEX "_factions_v_version_version_created_at_idx" ON "_factions_v" USING btree ("version_created_at");
  CREATE INDEX "_factions_v_version_version__status_idx" ON "_factions_v" USING btree ("version__status");
  CREATE INDEX "_factions_v_created_at_idx" ON "_factions_v" USING btree ("created_at");
  CREATE INDEX "_factions_v_updated_at_idx" ON "_factions_v" USING btree ("updated_at");
  CREATE INDEX "_factions_v_latest_idx" ON "_factions_v" USING btree ("latest");
  CREATE INDEX "version_project_version_slug_idx" ON "_factions_v" USING btree ("version_project_id","version_slug");
  CREATE INDEX "equipment_images_order_idx" ON "equipment_images" USING btree ("_order");
  CREATE INDEX "equipment_images_parent_id_idx" ON "equipment_images" USING btree ("_parent_id");
  CREATE INDEX "equipment_images_media_idx" ON "equipment_images" USING btree ("media_id");
  CREATE INDEX "equipment_slug_idx" ON "equipment" USING btree ("slug");
  CREATE INDEX "equipment_project_idx" ON "equipment" USING btree ("project_id");
  CREATE INDEX "equipment_faction_idx" ON "equipment" USING btree ("faction_id");
  CREATE UNIQUE INDEX "equipment_legacy_key_idx" ON "equipment" USING btree ("legacy_key");
  CREATE INDEX "equipment_updated_at_idx" ON "equipment" USING btree ("updated_at");
  CREATE INDEX "equipment_created_at_idx" ON "equipment" USING btree ("created_at");
  CREATE INDEX "equipment__status_idx" ON "equipment" USING btree ("_status");
  CREATE UNIQUE INDEX "project_slug_2_idx" ON "equipment" USING btree ("project_id","slug");
  CREATE INDEX "_equipment_v_version_images_order_idx" ON "_equipment_v_version_images" USING btree ("_order");
  CREATE INDEX "_equipment_v_version_images_parent_id_idx" ON "_equipment_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_equipment_v_version_images_media_idx" ON "_equipment_v_version_images" USING btree ("media_id");
  CREATE INDEX "_equipment_v_parent_idx" ON "_equipment_v" USING btree ("parent_id");
  CREATE INDEX "_equipment_v_version_version_slug_idx" ON "_equipment_v" USING btree ("version_slug");
  CREATE INDEX "_equipment_v_version_version_project_idx" ON "_equipment_v" USING btree ("version_project_id");
  CREATE INDEX "_equipment_v_version_version_faction_idx" ON "_equipment_v" USING btree ("version_faction_id");
  CREATE INDEX "_equipment_v_version_version_legacy_key_idx" ON "_equipment_v" USING btree ("version_legacy_key");
  CREATE INDEX "_equipment_v_version_version_updated_at_idx" ON "_equipment_v" USING btree ("version_updated_at");
  CREATE INDEX "_equipment_v_version_version_created_at_idx" ON "_equipment_v" USING btree ("version_created_at");
  CREATE INDEX "_equipment_v_version_version__status_idx" ON "_equipment_v" USING btree ("version__status");
  CREATE INDEX "_equipment_v_created_at_idx" ON "_equipment_v" USING btree ("created_at");
  CREATE INDEX "_equipment_v_updated_at_idx" ON "_equipment_v" USING btree ("updated_at");
  CREATE INDEX "_equipment_v_latest_idx" ON "_equipment_v" USING btree ("latest");
  CREATE INDEX "version_project_version_slug_2_idx" ON "_equipment_v" USING btree ("version_project_id","version_slug");
  ALTER TABLE "characters" ADD CONSTRAINT "characters_primary_faction_id_factions_id_fk" FOREIGN KEY ("primary_faction_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_rels" ADD CONSTRAINT "characters_rels_factions_fk" FOREIGN KEY ("factions_id") REFERENCES "public"."factions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_characters_v" ADD CONSTRAINT "_characters_v_version_primary_faction_id_factions_id_fk" FOREIGN KEY ("version_primary_faction_id") REFERENCES "public"."factions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_characters_v_rels" ADD CONSTRAINT "_characters_v_rels_factions_fk" FOREIGN KEY ("factions_id") REFERENCES "public"."factions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_factions_fk" FOREIGN KEY ("factions_id") REFERENCES "public"."factions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipment_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "characters_primary_faction_idx" ON "characters" USING btree ("primary_faction_id");
  CREATE UNIQUE INDEX "project_slug_1_idx" ON "characters" USING btree ("project_id","slug");
  CREATE INDEX "characters_rels_factions_id_idx" ON "characters_rels" USING btree ("factions_id");
  CREATE INDEX "_characters_v_version_version_primary_faction_idx" ON "_characters_v" USING btree ("version_primary_faction_id");
  CREATE INDEX "version_project_version_slug_1_idx" ON "_characters_v" USING btree ("version_project_id","version_slug");
  CREATE INDEX "_characters_v_rels_factions_id_idx" ON "_characters_v_rels" USING btree ("factions_id");
  CREATE INDEX "payload_locked_documents_rels_factions_id_idx" ON "payload_locked_documents_rels" USING btree ("factions_id");
  CREATE INDEX "payload_locked_documents_rels_equipment_id_idx" ON "payload_locked_documents_rels" USING btree ("equipment_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "factions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_factions_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "equipment_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "equipment" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_equipment_v_version_images" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_equipment_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "characters" DROP CONSTRAINT "characters_primary_faction_id_factions_id_fk";
  
  ALTER TABLE "characters_rels" DROP CONSTRAINT "characters_rels_factions_fk";
  
  ALTER TABLE "_characters_v" DROP CONSTRAINT "_characters_v_version_primary_faction_id_factions_id_fk";
  
  ALTER TABLE "_characters_v_rels" DROP CONSTRAINT "_characters_v_rels_factions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_factions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_equipment_fk";
  
  DROP TABLE "factions" CASCADE;
  DROP TABLE "_factions_v" CASCADE;
  DROP TABLE "equipment_images" CASCADE;
  DROP TABLE "equipment" CASCADE;
  DROP TABLE "_equipment_v_version_images" CASCADE;
  DROP TABLE "_equipment_v" CASCADE;
  DROP INDEX "characters_primary_faction_idx";
  DROP INDEX "project_slug_1_idx";
  DROP INDEX "characters_rels_factions_id_idx";
  DROP INDEX "_characters_v_version_version_primary_faction_idx";
  DROP INDEX "version_project_version_slug_1_idx";
  DROP INDEX "_characters_v_rels_factions_id_idx";
  DROP INDEX "payload_locked_documents_rels_factions_id_idx";
  DROP INDEX "payload_locked_documents_rels_equipment_id_idx";
  CREATE UNIQUE INDEX "project_slug_idx" ON "characters" USING btree ("project_id","slug");
  CREATE INDEX "version_project_version_slug_idx" ON "_characters_v" USING btree ("version_project_id","version_slug");
  ALTER TABLE "characters" DROP COLUMN "primary_faction_id";
  ALTER TABLE "characters_rels" DROP COLUMN "factions_id";
  ALTER TABLE "_characters_v" DROP COLUMN "version_primary_faction_id";
  ALTER TABLE "_characters_v_rels" DROP COLUMN "factions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "factions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "equipment_id";
  DROP TYPE "public"."enum_factions_type";
  DROP TYPE "public"."enum_factions_listing_visibility";
  DROP TYPE "public"."enum_factions_access_level";
  DROP TYPE "public"."enum_factions_status";
  DROP TYPE "public"."enum__factions_v_version_type";
  DROP TYPE "public"."enum__factions_v_version_listing_visibility";
  DROP TYPE "public"."enum__factions_v_version_access_level";
  DROP TYPE "public"."enum__factions_v_version_status";
  DROP TYPE "public"."enum_equipment_listing_visibility";
  DROP TYPE "public"."enum_equipment_access_level";
  DROP TYPE "public"."enum_equipment_status";
  DROP TYPE "public"."enum__equipment_v_version_listing_visibility";
  DROP TYPE "public"."enum__equipment_v_version_access_level";
  DROP TYPE "public"."enum__equipment_v_version_status";`)
}
