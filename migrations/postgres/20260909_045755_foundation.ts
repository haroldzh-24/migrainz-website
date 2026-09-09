import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_placeholder_art" AS ENUM('art-a', 'art-b', 'art-c');
  CREATE TYPE "public"."enum_projects_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_projects_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_projects_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__projects_v_version_placeholder_art" AS ENUM('art-a', 'art-b', 'art-c');
  CREATE TYPE "public"."enum__projects_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__projects_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__projects_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_comics_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_comics_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_comics_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__comics_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__comics_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__comics_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_chapters_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_chapters_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_chapters_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__chapters_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__chapters_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__chapters_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_characters_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_characters_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_characters_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__characters_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__characters_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__characters_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_project_updates_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_project_updates_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_project_updates_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__project_updates_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__project_updates_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__project_updates_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_tracker_items_kind" AS ENUM('phase', 'milestone');
  CREATE TYPE "public"."enum_tracker_items_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_tracker_items_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_tracker_items_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tracker_items_v_version_kind" AS ENUM('phase', 'milestone');
  CREATE TYPE "public"."enum__tracker_items_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__tracker_items_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__tracker_items_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_galleries_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_galleries_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_galleries_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__galleries_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__galleries_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__galleries_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_archive_items_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_archive_items_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_archive_items_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__archive_items_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__archive_items_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__archive_items_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_media_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_media_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum_media_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__media_v_version_listing_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum__media_v_version_access_level" AS ENUM('public', 'patron');
  CREATE TYPE "public"."enum__media_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"project_code" varchar,
  	"years_active" varchar,
  	"status" varchar DEFAULT 'IN DEVELOPMENT',
  	"production_phase" varchar,
  	"summary" varchar,
  	"description" varchar,
  	"writing" jsonb,
  	"hero_image_id" integer,
  	"category_label" varchar,
  	"placeholder_art" "enum_projects_placeholder_art" DEFAULT 'art-a',
  	"content_updated" timestamp(3) with time zone,
  	"listing_visibility" "enum_projects_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_projects_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_projects_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "projects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"galleries_id" integer,
  	"categories_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "_projects_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_project_code" varchar,
  	"version_years_active" varchar,
  	"version_status" varchar DEFAULT 'IN DEVELOPMENT',
  	"version_production_phase" varchar,
  	"version_summary" varchar,
  	"version_description" varchar,
  	"version_writing" jsonb,
  	"version_hero_image_id" integer,
  	"version_category_label" varchar,
  	"version_placeholder_art" "enum__projects_v_version_placeholder_art" DEFAULT 'art-a',
  	"version_content_updated" timestamp(3) with time zone,
  	"version_listing_visibility" "enum__projects_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__projects_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__projects_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_projects_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"galleries_id" integer,
  	"categories_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "comics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"project_id" integer,
  	"description" varchar,
  	"cover_id" integer,
  	"listing_visibility" "enum_comics_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_comics_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_comics_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_comics_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_project_id" integer,
  	"version_description" varchar,
  	"version_cover_id" integer,
  	"version_listing_visibility" "enum__comics_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__comics_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__comics_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "chapters_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "chapters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"comic_id" integer,
  	"chapter_number" numeric,
  	"description" varchar,
  	"route_key" varchar,
  	"listing_visibility" "enum_chapters_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_chapters_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_chapters_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_chapters_v_version_pages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_chapters_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_comic_id" integer,
  	"version_chapter_number" numeric,
  	"version_description" varchar,
  	"version_route_key" varchar,
  	"version_listing_visibility" "enum__chapters_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__chapters_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__chapters_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "characters_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "characters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"slug" varchar,
  	"project_id" integer,
  	"role" varchar,
  	"description" varchar,
  	"writing" jsonb,
  	"listing_visibility" "enum_characters_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_characters_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_characters_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "characters_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"chapters_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "_characters_v_version_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_characters_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_slug" varchar,
  	"version_project_id" integer,
  	"version_role" varchar,
  	"version_description" varchar,
  	"version_writing" jsonb,
  	"version_listing_visibility" "enum__characters_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__characters_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__characters_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_characters_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"chapters_id" integer,
  	"tags_id" integer
  );
  
  CREATE TABLE "project_updates_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "project_updates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"project_id" integer,
  	"date" timestamp(3) with time zone,
  	"writing" jsonb,
  	"description" varchar,
  	"milestone_id" integer,
  	"status_info" varchar,
  	"listing_visibility" "enum_project_updates_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_project_updates_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_project_updates_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_project_updates_v_version_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_project_updates_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_project_id" integer,
  	"version_date" timestamp(3) with time zone,
  	"version_writing" jsonb,
  	"version_description" varchar,
  	"version_milestone_id" integer,
  	"version_status_info" varchar,
  	"version_listing_visibility" "enum__project_updates_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__project_updates_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__project_updates_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "tracker_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"project_id" integer,
  	"kind" "enum_tracker_items_kind" DEFAULT 'phase',
  	"percentage" numeric,
  	"order" numeric DEFAULT 0,
  	"status" varchar,
  	"last_updated" timestamp(3) with time zone,
  	"listing_visibility" "enum_tracker_items_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_tracker_items_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tracker_items_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_tracker_items_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_project_id" integer,
  	"version_kind" "enum__tracker_items_v_version_kind" DEFAULT 'phase',
  	"version_percentage" numeric,
  	"version_order" numeric DEFAULT 0,
  	"version_status" varchar,
  	"version_last_updated" timestamp(3) with time zone,
  	"version_listing_visibility" "enum__tracker_items_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__tracker_items_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tracker_items_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "galleries_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "galleries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"project_id" integer,
  	"description" varchar,
  	"listing_visibility" "enum_galleries_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_galleries_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_galleries_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "galleries_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "_galleries_v_version_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_galleries_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_project_id" integer,
  	"version_description" varchar,
  	"version_listing_visibility" "enum__galleries_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__galleries_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__galleries_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_galleries_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "archive_items_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar
  );
  
  CREATE TABLE "archive_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"project_id" integer,
  	"category_id" integer,
  	"description" varchar,
  	"date" timestamp(3) with time zone,
  	"listing_visibility" "enum_archive_items_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_archive_items_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_archive_items_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "archive_items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "_archive_items_v_version_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" varchar,
  	"alt" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_archive_items_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_project_id" integer,
  	"version_category_id" integer,
  	"version_description" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_listing_visibility" "enum__archive_items_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__archive_items_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__archive_items_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_archive_items_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"upload_key" varchar,
  	"project_id" integer,
  	"listing_visibility" "enum_media_listing_visibility" DEFAULT 'public',
  	"access_level" "enum_media_access_level" DEFAULT 'public',
  	"listing_summary" varchar,
  	"legacy_key" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_media_status" DEFAULT 'draft',
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  CREATE TABLE "_media_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_alt" varchar,
  	"version_caption" varchar,
  	"version_upload_key" varchar,
  	"version_project_id" integer,
  	"version_listing_visibility" "enum__media_v_version_listing_visibility" DEFAULT 'public',
  	"version_access_level" "enum__media_v_version_access_level" DEFAULT 'public',
  	"version_listing_summary" varchar,
  	"version_legacy_key" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__media_v_version_status" DEFAULT 'draft',
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"version_sizes_thumbnail_url" varchar,
  	"version_sizes_thumbnail_width" numeric,
  	"version_sizes_thumbnail_height" numeric,
  	"version_sizes_thumbnail_mime_type" varchar,
  	"version_sizes_thumbnail_filesize" numeric,
  	"version_sizes_thumbnail_filename" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"projects_id" integer,
  	"comics_id" integer,
  	"chapters_id" integer,
  	"characters_id" integer,
  	"project_updates_id" integer,
  	"tracker_items_id" integer,
  	"galleries_id" integer,
  	"archive_items_id" integer,
  	"media_id" integer,
  	"tags_id" integer,
  	"categories_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_galleries_fk" FOREIGN KEY ("galleries_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_parent_id_projects_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v" ADD CONSTRAINT "_projects_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_projects_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_galleries_fk" FOREIGN KEY ("galleries_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_projects_v_rels" ADD CONSTRAINT "_projects_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "comics" ADD CONSTRAINT "comics_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comics" ADD CONSTRAINT "comics_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_comics_v" ADD CONSTRAINT "_comics_v_parent_id_comics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_comics_v" ADD CONSTRAINT "_comics_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_comics_v" ADD CONSTRAINT "_comics_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chapters_pages" ADD CONSTRAINT "chapters_pages_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "chapters_pages" ADD CONSTRAINT "chapters_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "chapters" ADD CONSTRAINT "chapters_comic_id_comics_id_fk" FOREIGN KEY ("comic_id") REFERENCES "public"."comics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_chapters_v_version_pages" ADD CONSTRAINT "_chapters_v_version_pages_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_chapters_v_version_pages" ADD CONSTRAINT "_chapters_v_version_pages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_chapters_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_chapters_v" ADD CONSTRAINT "_chapters_v_parent_id_chapters_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."chapters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_chapters_v" ADD CONSTRAINT "_chapters_v_version_comic_id_comics_id_fk" FOREIGN KEY ("version_comic_id") REFERENCES "public"."comics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_images" ADD CONSTRAINT "characters_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_images" ADD CONSTRAINT "characters_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "characters_rels" ADD CONSTRAINT "characters_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "characters_rels" ADD CONSTRAINT "characters_rels_chapters_fk" FOREIGN KEY ("chapters_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "characters_rels" ADD CONSTRAINT "characters_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_characters_v_version_images" ADD CONSTRAINT "_characters_v_version_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_characters_v_version_images" ADD CONSTRAINT "_characters_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_characters_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_characters_v" ADD CONSTRAINT "_characters_v_parent_id_characters_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_characters_v" ADD CONSTRAINT "_characters_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_characters_v_rels" ADD CONSTRAINT "_characters_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_characters_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_characters_v_rels" ADD CONSTRAINT "_characters_v_rels_chapters_fk" FOREIGN KEY ("chapters_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_characters_v_rels" ADD CONSTRAINT "_characters_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "project_updates_images" ADD CONSTRAINT "project_updates_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "project_updates_images" ADD CONSTRAINT "project_updates_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."project_updates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_milestone_id_tracker_items_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."tracker_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v_version_images" ADD CONSTRAINT "_project_updates_v_version_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v_version_images" ADD CONSTRAINT "_project_updates_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_project_updates_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_project_updates_v" ADD CONSTRAINT "_project_updates_v_parent_id_project_updates_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."project_updates"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v" ADD CONSTRAINT "_project_updates_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_project_updates_v" ADD CONSTRAINT "_project_updates_v_version_milestone_id_tracker_items_id_fk" FOREIGN KEY ("version_milestone_id") REFERENCES "public"."tracker_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tracker_items" ADD CONSTRAINT "tracker_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracker_items_v" ADD CONSTRAINT "_tracker_items_v_parent_id_tracker_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tracker_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tracker_items_v" ADD CONSTRAINT "_tracker_items_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galleries_images" ADD CONSTRAINT "galleries_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galleries_images" ADD CONSTRAINT "galleries_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galleries" ADD CONSTRAINT "galleries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galleries_rels" ADD CONSTRAINT "galleries_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galleries_rels" ADD CONSTRAINT "galleries_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galleries_v_version_images" ADD CONSTRAINT "_galleries_v_version_images_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galleries_v_version_images" ADD CONSTRAINT "_galleries_v_version_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_galleries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galleries_v" ADD CONSTRAINT "_galleries_v_parent_id_galleries_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."galleries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galleries_v" ADD CONSTRAINT "_galleries_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galleries_v_rels" ADD CONSTRAINT "_galleries_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_galleries_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galleries_v_rels" ADD CONSTRAINT "_galleries_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "archive_items_files" ADD CONSTRAINT "archive_items_files_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "archive_items_files" ADD CONSTRAINT "archive_items_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."archive_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "archive_items" ADD CONSTRAINT "archive_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "archive_items" ADD CONSTRAINT "archive_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "archive_items_rels" ADD CONSTRAINT "archive_items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."archive_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "archive_items_rels" ADD CONSTRAINT "archive_items_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_archive_items_v_version_files" ADD CONSTRAINT "_archive_items_v_version_files_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_archive_items_v_version_files" ADD CONSTRAINT "_archive_items_v_version_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_archive_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_archive_items_v" ADD CONSTRAINT "_archive_items_v_parent_id_archive_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."archive_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_archive_items_v" ADD CONSTRAINT "_archive_items_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_archive_items_v" ADD CONSTRAINT "_archive_items_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_archive_items_v_rels" ADD CONSTRAINT "_archive_items_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_archive_items_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_archive_items_v_rels" ADD CONSTRAINT "_archive_items_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_parent_id_media_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_media_v" ADD CONSTRAINT "_media_v_version_project_id_projects_id_fk" FOREIGN KEY ("version_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comics_fk" FOREIGN KEY ("comics_id") REFERENCES "public"."comics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_chapters_fk" FOREIGN KEY ("chapters_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_characters_fk" FOREIGN KEY ("characters_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_updates_fk" FOREIGN KEY ("project_updates_id") REFERENCES "public"."project_updates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tracker_items_fk" FOREIGN KEY ("tracker_items_id") REFERENCES "public"."tracker_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_galleries_fk" FOREIGN KEY ("galleries_id") REFERENCES "public"."galleries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_archive_items_fk" FOREIGN KEY ("archive_items_id") REFERENCES "public"."archive_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE UNIQUE INDEX "projects_project_code_idx" ON "projects" USING btree ("project_code");
  CREATE INDEX "projects_hero_image_idx" ON "projects" USING btree ("hero_image_id");
  CREATE UNIQUE INDEX "projects_legacy_key_idx" ON "projects" USING btree ("legacy_key");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX "projects__status_idx" ON "projects" USING btree ("_status");
  CREATE INDEX "projects_rels_order_idx" ON "projects_rels" USING btree ("order");
  CREATE INDEX "projects_rels_parent_idx" ON "projects_rels" USING btree ("parent_id");
  CREATE INDEX "projects_rels_path_idx" ON "projects_rels" USING btree ("path");
  CREATE INDEX "projects_rels_galleries_id_idx" ON "projects_rels" USING btree ("galleries_id");
  CREATE INDEX "projects_rels_categories_id_idx" ON "projects_rels" USING btree ("categories_id");
  CREATE INDEX "projects_rels_tags_id_idx" ON "projects_rels" USING btree ("tags_id");
  CREATE INDEX "_projects_v_parent_idx" ON "_projects_v" USING btree ("parent_id");
  CREATE INDEX "_projects_v_version_version_slug_idx" ON "_projects_v" USING btree ("version_slug");
  CREATE INDEX "_projects_v_version_version_project_code_idx" ON "_projects_v" USING btree ("version_project_code");
  CREATE INDEX "_projects_v_version_version_hero_image_idx" ON "_projects_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_projects_v_version_version_legacy_key_idx" ON "_projects_v" USING btree ("version_legacy_key");
  CREATE INDEX "_projects_v_version_version_updated_at_idx" ON "_projects_v" USING btree ("version_updated_at");
  CREATE INDEX "_projects_v_version_version_created_at_idx" ON "_projects_v" USING btree ("version_created_at");
  CREATE INDEX "_projects_v_version_version__status_idx" ON "_projects_v" USING btree ("version__status");
  CREATE INDEX "_projects_v_created_at_idx" ON "_projects_v" USING btree ("created_at");
  CREATE INDEX "_projects_v_updated_at_idx" ON "_projects_v" USING btree ("updated_at");
  CREATE INDEX "_projects_v_latest_idx" ON "_projects_v" USING btree ("latest");
  CREATE INDEX "_projects_v_rels_order_idx" ON "_projects_v_rels" USING btree ("order");
  CREATE INDEX "_projects_v_rels_parent_idx" ON "_projects_v_rels" USING btree ("parent_id");
  CREATE INDEX "_projects_v_rels_path_idx" ON "_projects_v_rels" USING btree ("path");
  CREATE INDEX "_projects_v_rels_galleries_id_idx" ON "_projects_v_rels" USING btree ("galleries_id");
  CREATE INDEX "_projects_v_rels_categories_id_idx" ON "_projects_v_rels" USING btree ("categories_id");
  CREATE INDEX "_projects_v_rels_tags_id_idx" ON "_projects_v_rels" USING btree ("tags_id");
  CREATE UNIQUE INDEX "comics_slug_idx" ON "comics" USING btree ("slug");
  CREATE INDEX "comics_project_idx" ON "comics" USING btree ("project_id");
  CREATE INDEX "comics_cover_idx" ON "comics" USING btree ("cover_id");
  CREATE UNIQUE INDEX "comics_legacy_key_idx" ON "comics" USING btree ("legacy_key");
  CREATE INDEX "comics_updated_at_idx" ON "comics" USING btree ("updated_at");
  CREATE INDEX "comics_created_at_idx" ON "comics" USING btree ("created_at");
  CREATE INDEX "comics__status_idx" ON "comics" USING btree ("_status");
  CREATE INDEX "_comics_v_parent_idx" ON "_comics_v" USING btree ("parent_id");
  CREATE INDEX "_comics_v_version_version_slug_idx" ON "_comics_v" USING btree ("version_slug");
  CREATE INDEX "_comics_v_version_version_project_idx" ON "_comics_v" USING btree ("version_project_id");
  CREATE INDEX "_comics_v_version_version_cover_idx" ON "_comics_v" USING btree ("version_cover_id");
  CREATE INDEX "_comics_v_version_version_legacy_key_idx" ON "_comics_v" USING btree ("version_legacy_key");
  CREATE INDEX "_comics_v_version_version_updated_at_idx" ON "_comics_v" USING btree ("version_updated_at");
  CREATE INDEX "_comics_v_version_version_created_at_idx" ON "_comics_v" USING btree ("version_created_at");
  CREATE INDEX "_comics_v_version_version__status_idx" ON "_comics_v" USING btree ("version__status");
  CREATE INDEX "_comics_v_created_at_idx" ON "_comics_v" USING btree ("created_at");
  CREATE INDEX "_comics_v_updated_at_idx" ON "_comics_v" USING btree ("updated_at");
  CREATE INDEX "_comics_v_latest_idx" ON "_comics_v" USING btree ("latest");
  CREATE INDEX "chapters_pages_order_idx" ON "chapters_pages" USING btree ("_order");
  CREATE INDEX "chapters_pages_parent_id_idx" ON "chapters_pages" USING btree ("_parent_id");
  CREATE INDEX "chapters_pages_media_idx" ON "chapters_pages" USING btree ("media_id");
  CREATE INDEX "chapters_slug_idx" ON "chapters" USING btree ("slug");
  CREATE INDEX "chapters_comic_idx" ON "chapters" USING btree ("comic_id");
  CREATE UNIQUE INDEX "chapters_route_key_idx" ON "chapters" USING btree ("route_key");
  CREATE UNIQUE INDEX "chapters_legacy_key_idx" ON "chapters" USING btree ("legacy_key");
  CREATE INDEX "chapters_updated_at_idx" ON "chapters" USING btree ("updated_at");
  CREATE INDEX "chapters_created_at_idx" ON "chapters" USING btree ("created_at");
  CREATE INDEX "chapters__status_idx" ON "chapters" USING btree ("_status");
  CREATE INDEX "_chapters_v_version_pages_order_idx" ON "_chapters_v_version_pages" USING btree ("_order");
  CREATE INDEX "_chapters_v_version_pages_parent_id_idx" ON "_chapters_v_version_pages" USING btree ("_parent_id");
  CREATE INDEX "_chapters_v_version_pages_media_idx" ON "_chapters_v_version_pages" USING btree ("media_id");
  CREATE INDEX "_chapters_v_parent_idx" ON "_chapters_v" USING btree ("parent_id");
  CREATE INDEX "_chapters_v_version_version_slug_idx" ON "_chapters_v" USING btree ("version_slug");
  CREATE INDEX "_chapters_v_version_version_comic_idx" ON "_chapters_v" USING btree ("version_comic_id");
  CREATE INDEX "_chapters_v_version_version_route_key_idx" ON "_chapters_v" USING btree ("version_route_key");
  CREATE INDEX "_chapters_v_version_version_legacy_key_idx" ON "_chapters_v" USING btree ("version_legacy_key");
  CREATE INDEX "_chapters_v_version_version_updated_at_idx" ON "_chapters_v" USING btree ("version_updated_at");
  CREATE INDEX "_chapters_v_version_version_created_at_idx" ON "_chapters_v" USING btree ("version_created_at");
  CREATE INDEX "_chapters_v_version_version__status_idx" ON "_chapters_v" USING btree ("version__status");
  CREATE INDEX "_chapters_v_created_at_idx" ON "_chapters_v" USING btree ("created_at");
  CREATE INDEX "_chapters_v_updated_at_idx" ON "_chapters_v" USING btree ("updated_at");
  CREATE INDEX "_chapters_v_latest_idx" ON "_chapters_v" USING btree ("latest");
  CREATE INDEX "characters_images_order_idx" ON "characters_images" USING btree ("_order");
  CREATE INDEX "characters_images_parent_id_idx" ON "characters_images" USING btree ("_parent_id");
  CREATE INDEX "characters_images_media_idx" ON "characters_images" USING btree ("media_id");
  CREATE INDEX "characters_slug_idx" ON "characters" USING btree ("slug");
  CREATE INDEX "characters_project_idx" ON "characters" USING btree ("project_id");
  CREATE UNIQUE INDEX "characters_legacy_key_idx" ON "characters" USING btree ("legacy_key");
  CREATE INDEX "characters_updated_at_idx" ON "characters" USING btree ("updated_at");
  CREATE INDEX "characters_created_at_idx" ON "characters" USING btree ("created_at");
  CREATE INDEX "characters__status_idx" ON "characters" USING btree ("_status");
  CREATE UNIQUE INDEX "project_slug_idx" ON "characters" USING btree ("project_id","slug");
  CREATE INDEX "characters_rels_order_idx" ON "characters_rels" USING btree ("order");
  CREATE INDEX "characters_rels_parent_idx" ON "characters_rels" USING btree ("parent_id");
  CREATE INDEX "characters_rels_path_idx" ON "characters_rels" USING btree ("path");
  CREATE INDEX "characters_rels_chapters_id_idx" ON "characters_rels" USING btree ("chapters_id");
  CREATE INDEX "characters_rels_tags_id_idx" ON "characters_rels" USING btree ("tags_id");
  CREATE INDEX "_characters_v_version_images_order_idx" ON "_characters_v_version_images" USING btree ("_order");
  CREATE INDEX "_characters_v_version_images_parent_id_idx" ON "_characters_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_characters_v_version_images_media_idx" ON "_characters_v_version_images" USING btree ("media_id");
  CREATE INDEX "_characters_v_parent_idx" ON "_characters_v" USING btree ("parent_id");
  CREATE INDEX "_characters_v_version_version_slug_idx" ON "_characters_v" USING btree ("version_slug");
  CREATE INDEX "_characters_v_version_version_project_idx" ON "_characters_v" USING btree ("version_project_id");
  CREATE INDEX "_characters_v_version_version_legacy_key_idx" ON "_characters_v" USING btree ("version_legacy_key");
  CREATE INDEX "_characters_v_version_version_updated_at_idx" ON "_characters_v" USING btree ("version_updated_at");
  CREATE INDEX "_characters_v_version_version_created_at_idx" ON "_characters_v" USING btree ("version_created_at");
  CREATE INDEX "_characters_v_version_version__status_idx" ON "_characters_v" USING btree ("version__status");
  CREATE INDEX "_characters_v_created_at_idx" ON "_characters_v" USING btree ("created_at");
  CREATE INDEX "_characters_v_updated_at_idx" ON "_characters_v" USING btree ("updated_at");
  CREATE INDEX "_characters_v_latest_idx" ON "_characters_v" USING btree ("latest");
  CREATE INDEX "version_project_version_slug_idx" ON "_characters_v" USING btree ("version_project_id","version_slug");
  CREATE INDEX "_characters_v_rels_order_idx" ON "_characters_v_rels" USING btree ("order");
  CREATE INDEX "_characters_v_rels_parent_idx" ON "_characters_v_rels" USING btree ("parent_id");
  CREATE INDEX "_characters_v_rels_path_idx" ON "_characters_v_rels" USING btree ("path");
  CREATE INDEX "_characters_v_rels_chapters_id_idx" ON "_characters_v_rels" USING btree ("chapters_id");
  CREATE INDEX "_characters_v_rels_tags_id_idx" ON "_characters_v_rels" USING btree ("tags_id");
  CREATE INDEX "project_updates_images_order_idx" ON "project_updates_images" USING btree ("_order");
  CREATE INDEX "project_updates_images_parent_id_idx" ON "project_updates_images" USING btree ("_parent_id");
  CREATE INDEX "project_updates_images_media_idx" ON "project_updates_images" USING btree ("media_id");
  CREATE INDEX "project_updates_project_idx" ON "project_updates" USING btree ("project_id");
  CREATE INDEX "project_updates_milestone_idx" ON "project_updates" USING btree ("milestone_id");
  CREATE UNIQUE INDEX "project_updates_legacy_key_idx" ON "project_updates" USING btree ("legacy_key");
  CREATE INDEX "project_updates_updated_at_idx" ON "project_updates" USING btree ("updated_at");
  CREATE INDEX "project_updates_created_at_idx" ON "project_updates" USING btree ("created_at");
  CREATE INDEX "project_updates__status_idx" ON "project_updates" USING btree ("_status");
  CREATE INDEX "_project_updates_v_version_images_order_idx" ON "_project_updates_v_version_images" USING btree ("_order");
  CREATE INDEX "_project_updates_v_version_images_parent_id_idx" ON "_project_updates_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_project_updates_v_version_images_media_idx" ON "_project_updates_v_version_images" USING btree ("media_id");
  CREATE INDEX "_project_updates_v_parent_idx" ON "_project_updates_v" USING btree ("parent_id");
  CREATE INDEX "_project_updates_v_version_version_project_idx" ON "_project_updates_v" USING btree ("version_project_id");
  CREATE INDEX "_project_updates_v_version_version_milestone_idx" ON "_project_updates_v" USING btree ("version_milestone_id");
  CREATE INDEX "_project_updates_v_version_version_legacy_key_idx" ON "_project_updates_v" USING btree ("version_legacy_key");
  CREATE INDEX "_project_updates_v_version_version_updated_at_idx" ON "_project_updates_v" USING btree ("version_updated_at");
  CREATE INDEX "_project_updates_v_version_version_created_at_idx" ON "_project_updates_v" USING btree ("version_created_at");
  CREATE INDEX "_project_updates_v_version_version__status_idx" ON "_project_updates_v" USING btree ("version__status");
  CREATE INDEX "_project_updates_v_created_at_idx" ON "_project_updates_v" USING btree ("created_at");
  CREATE INDEX "_project_updates_v_updated_at_idx" ON "_project_updates_v" USING btree ("updated_at");
  CREATE INDEX "_project_updates_v_latest_idx" ON "_project_updates_v" USING btree ("latest");
  CREATE INDEX "tracker_items_project_idx" ON "tracker_items" USING btree ("project_id");
  CREATE UNIQUE INDEX "tracker_items_legacy_key_idx" ON "tracker_items" USING btree ("legacy_key");
  CREATE INDEX "tracker_items_updated_at_idx" ON "tracker_items" USING btree ("updated_at");
  CREATE INDEX "tracker_items_created_at_idx" ON "tracker_items" USING btree ("created_at");
  CREATE INDEX "tracker_items__status_idx" ON "tracker_items" USING btree ("_status");
  CREATE INDEX "_tracker_items_v_parent_idx" ON "_tracker_items_v" USING btree ("parent_id");
  CREATE INDEX "_tracker_items_v_version_version_project_idx" ON "_tracker_items_v" USING btree ("version_project_id");
  CREATE INDEX "_tracker_items_v_version_version_legacy_key_idx" ON "_tracker_items_v" USING btree ("version_legacy_key");
  CREATE INDEX "_tracker_items_v_version_version_updated_at_idx" ON "_tracker_items_v" USING btree ("version_updated_at");
  CREATE INDEX "_tracker_items_v_version_version_created_at_idx" ON "_tracker_items_v" USING btree ("version_created_at");
  CREATE INDEX "_tracker_items_v_version_version__status_idx" ON "_tracker_items_v" USING btree ("version__status");
  CREATE INDEX "_tracker_items_v_created_at_idx" ON "_tracker_items_v" USING btree ("created_at");
  CREATE INDEX "_tracker_items_v_updated_at_idx" ON "_tracker_items_v" USING btree ("updated_at");
  CREATE INDEX "_tracker_items_v_latest_idx" ON "_tracker_items_v" USING btree ("latest");
  CREATE INDEX "galleries_images_order_idx" ON "galleries_images" USING btree ("_order");
  CREATE INDEX "galleries_images_parent_id_idx" ON "galleries_images" USING btree ("_parent_id");
  CREATE INDEX "galleries_images_media_idx" ON "galleries_images" USING btree ("media_id");
  CREATE UNIQUE INDEX "galleries_slug_idx" ON "galleries" USING btree ("slug");
  CREATE INDEX "galleries_project_idx" ON "galleries" USING btree ("project_id");
  CREATE UNIQUE INDEX "galleries_legacy_key_idx" ON "galleries" USING btree ("legacy_key");
  CREATE INDEX "galleries_updated_at_idx" ON "galleries" USING btree ("updated_at");
  CREATE INDEX "galleries_created_at_idx" ON "galleries" USING btree ("created_at");
  CREATE INDEX "galleries__status_idx" ON "galleries" USING btree ("_status");
  CREATE INDEX "galleries_rels_order_idx" ON "galleries_rels" USING btree ("order");
  CREATE INDEX "galleries_rels_parent_idx" ON "galleries_rels" USING btree ("parent_id");
  CREATE INDEX "galleries_rels_path_idx" ON "galleries_rels" USING btree ("path");
  CREATE INDEX "galleries_rels_tags_id_idx" ON "galleries_rels" USING btree ("tags_id");
  CREATE INDEX "_galleries_v_version_images_order_idx" ON "_galleries_v_version_images" USING btree ("_order");
  CREATE INDEX "_galleries_v_version_images_parent_id_idx" ON "_galleries_v_version_images" USING btree ("_parent_id");
  CREATE INDEX "_galleries_v_version_images_media_idx" ON "_galleries_v_version_images" USING btree ("media_id");
  CREATE INDEX "_galleries_v_parent_idx" ON "_galleries_v" USING btree ("parent_id");
  CREATE INDEX "_galleries_v_version_version_slug_idx" ON "_galleries_v" USING btree ("version_slug");
  CREATE INDEX "_galleries_v_version_version_project_idx" ON "_galleries_v" USING btree ("version_project_id");
  CREATE INDEX "_galleries_v_version_version_legacy_key_idx" ON "_galleries_v" USING btree ("version_legacy_key");
  CREATE INDEX "_galleries_v_version_version_updated_at_idx" ON "_galleries_v" USING btree ("version_updated_at");
  CREATE INDEX "_galleries_v_version_version_created_at_idx" ON "_galleries_v" USING btree ("version_created_at");
  CREATE INDEX "_galleries_v_version_version__status_idx" ON "_galleries_v" USING btree ("version__status");
  CREATE INDEX "_galleries_v_created_at_idx" ON "_galleries_v" USING btree ("created_at");
  CREATE INDEX "_galleries_v_updated_at_idx" ON "_galleries_v" USING btree ("updated_at");
  CREATE INDEX "_galleries_v_latest_idx" ON "_galleries_v" USING btree ("latest");
  CREATE INDEX "_galleries_v_rels_order_idx" ON "_galleries_v_rels" USING btree ("order");
  CREATE INDEX "_galleries_v_rels_parent_idx" ON "_galleries_v_rels" USING btree ("parent_id");
  CREATE INDEX "_galleries_v_rels_path_idx" ON "_galleries_v_rels" USING btree ("path");
  CREATE INDEX "_galleries_v_rels_tags_id_idx" ON "_galleries_v_rels" USING btree ("tags_id");
  CREATE INDEX "archive_items_files_order_idx" ON "archive_items_files" USING btree ("_order");
  CREATE INDEX "archive_items_files_parent_id_idx" ON "archive_items_files" USING btree ("_parent_id");
  CREATE INDEX "archive_items_files_media_idx" ON "archive_items_files" USING btree ("media_id");
  CREATE UNIQUE INDEX "archive_items_slug_idx" ON "archive_items" USING btree ("slug");
  CREATE INDEX "archive_items_project_idx" ON "archive_items" USING btree ("project_id");
  CREATE INDEX "archive_items_category_idx" ON "archive_items" USING btree ("category_id");
  CREATE UNIQUE INDEX "archive_items_legacy_key_idx" ON "archive_items" USING btree ("legacy_key");
  CREATE INDEX "archive_items_updated_at_idx" ON "archive_items" USING btree ("updated_at");
  CREATE INDEX "archive_items_created_at_idx" ON "archive_items" USING btree ("created_at");
  CREATE INDEX "archive_items__status_idx" ON "archive_items" USING btree ("_status");
  CREATE INDEX "archive_items_rels_order_idx" ON "archive_items_rels" USING btree ("order");
  CREATE INDEX "archive_items_rels_parent_idx" ON "archive_items_rels" USING btree ("parent_id");
  CREATE INDEX "archive_items_rels_path_idx" ON "archive_items_rels" USING btree ("path");
  CREATE INDEX "archive_items_rels_tags_id_idx" ON "archive_items_rels" USING btree ("tags_id");
  CREATE INDEX "_archive_items_v_version_files_order_idx" ON "_archive_items_v_version_files" USING btree ("_order");
  CREATE INDEX "_archive_items_v_version_files_parent_id_idx" ON "_archive_items_v_version_files" USING btree ("_parent_id");
  CREATE INDEX "_archive_items_v_version_files_media_idx" ON "_archive_items_v_version_files" USING btree ("media_id");
  CREATE INDEX "_archive_items_v_parent_idx" ON "_archive_items_v" USING btree ("parent_id");
  CREATE INDEX "_archive_items_v_version_version_slug_idx" ON "_archive_items_v" USING btree ("version_slug");
  CREATE INDEX "_archive_items_v_version_version_project_idx" ON "_archive_items_v" USING btree ("version_project_id");
  CREATE INDEX "_archive_items_v_version_version_category_idx" ON "_archive_items_v" USING btree ("version_category_id");
  CREATE INDEX "_archive_items_v_version_version_legacy_key_idx" ON "_archive_items_v" USING btree ("version_legacy_key");
  CREATE INDEX "_archive_items_v_version_version_updated_at_idx" ON "_archive_items_v" USING btree ("version_updated_at");
  CREATE INDEX "_archive_items_v_version_version_created_at_idx" ON "_archive_items_v" USING btree ("version_created_at");
  CREATE INDEX "_archive_items_v_version_version__status_idx" ON "_archive_items_v" USING btree ("version__status");
  CREATE INDEX "_archive_items_v_created_at_idx" ON "_archive_items_v" USING btree ("created_at");
  CREATE INDEX "_archive_items_v_updated_at_idx" ON "_archive_items_v" USING btree ("updated_at");
  CREATE INDEX "_archive_items_v_latest_idx" ON "_archive_items_v" USING btree ("latest");
  CREATE INDEX "_archive_items_v_rels_order_idx" ON "_archive_items_v_rels" USING btree ("order");
  CREATE INDEX "_archive_items_v_rels_parent_idx" ON "_archive_items_v_rels" USING btree ("parent_id");
  CREATE INDEX "_archive_items_v_rels_path_idx" ON "_archive_items_v_rels" USING btree ("path");
  CREATE INDEX "_archive_items_v_rels_tags_id_idx" ON "_archive_items_v_rels" USING btree ("tags_id");
  CREATE UNIQUE INDEX "media_upload_key_idx" ON "media" USING btree ("upload_key");
  CREATE INDEX "media_project_idx" ON "media" USING btree ("project_id");
  CREATE UNIQUE INDEX "media_legacy_key_idx" ON "media" USING btree ("legacy_key");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE INDEX "media__status_idx" ON "media" USING btree ("_status");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "_media_v_parent_idx" ON "_media_v" USING btree ("parent_id");
  CREATE INDEX "_media_v_version_version_upload_key_idx" ON "_media_v" USING btree ("version_upload_key");
  CREATE INDEX "_media_v_version_version_project_idx" ON "_media_v" USING btree ("version_project_id");
  CREATE INDEX "_media_v_version_version_legacy_key_idx" ON "_media_v" USING btree ("version_legacy_key");
  CREATE INDEX "_media_v_version_version_updated_at_idx" ON "_media_v" USING btree ("version_updated_at");
  CREATE INDEX "_media_v_version_version_created_at_idx" ON "_media_v" USING btree ("version_created_at");
  CREATE INDEX "_media_v_version_version__status_idx" ON "_media_v" USING btree ("version__status");
  CREATE INDEX "_media_v_version_version_filename_idx" ON "_media_v" USING btree ("version_filename");
  CREATE INDEX "_media_v_version_sizes_thumbnail_version_sizes_thumbnail_idx" ON "_media_v" USING btree ("version_sizes_thumbnail_filename");
  CREATE INDEX "_media_v_created_at_idx" ON "_media_v" USING btree ("created_at");
  CREATE INDEX "_media_v_updated_at_idx" ON "_media_v" USING btree ("updated_at");
  CREATE INDEX "_media_v_latest_idx" ON "_media_v" USING btree ("latest");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_comics_id_idx" ON "payload_locked_documents_rels" USING btree ("comics_id");
  CREATE INDEX "payload_locked_documents_rels_chapters_id_idx" ON "payload_locked_documents_rels" USING btree ("chapters_id");
  CREATE INDEX "payload_locked_documents_rels_characters_id_idx" ON "payload_locked_documents_rels" USING btree ("characters_id");
  CREATE INDEX "payload_locked_documents_rels_project_updates_id_idx" ON "payload_locked_documents_rels" USING btree ("project_updates_id");
  CREATE INDEX "payload_locked_documents_rels_tracker_items_id_idx" ON "payload_locked_documents_rels" USING btree ("tracker_items_id");
  CREATE INDEX "payload_locked_documents_rels_galleries_id_idx" ON "payload_locked_documents_rels" USING btree ("galleries_id");
  CREATE INDEX "payload_locked_documents_rels_archive_items_id_idx" ON "payload_locked_documents_rels" USING btree ("archive_items_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "projects_rels" CASCADE;
  DROP TABLE "_projects_v" CASCADE;
  DROP TABLE "_projects_v_rels" CASCADE;
  DROP TABLE "comics" CASCADE;
  DROP TABLE "_comics_v" CASCADE;
  DROP TABLE "chapters_pages" CASCADE;
  DROP TABLE "chapters" CASCADE;
  DROP TABLE "_chapters_v_version_pages" CASCADE;
  DROP TABLE "_chapters_v" CASCADE;
  DROP TABLE "characters_images" CASCADE;
  DROP TABLE "characters" CASCADE;
  DROP TABLE "characters_rels" CASCADE;
  DROP TABLE "_characters_v_version_images" CASCADE;
  DROP TABLE "_characters_v" CASCADE;
  DROP TABLE "_characters_v_rels" CASCADE;
  DROP TABLE "project_updates_images" CASCADE;
  DROP TABLE "project_updates" CASCADE;
  DROP TABLE "_project_updates_v_version_images" CASCADE;
  DROP TABLE "_project_updates_v" CASCADE;
  DROP TABLE "tracker_items" CASCADE;
  DROP TABLE "_tracker_items_v" CASCADE;
  DROP TABLE "galleries_images" CASCADE;
  DROP TABLE "galleries" CASCADE;
  DROP TABLE "galleries_rels" CASCADE;
  DROP TABLE "_galleries_v_version_images" CASCADE;
  DROP TABLE "_galleries_v" CASCADE;
  DROP TABLE "_galleries_v_rels" CASCADE;
  DROP TABLE "archive_items_files" CASCADE;
  DROP TABLE "archive_items" CASCADE;
  DROP TABLE "archive_items_rels" CASCADE;
  DROP TABLE "_archive_items_v_version_files" CASCADE;
  DROP TABLE "_archive_items_v" CASCADE;
  DROP TABLE "_archive_items_v_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "_media_v" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_projects_placeholder_art";
  DROP TYPE "public"."enum_projects_listing_visibility";
  DROP TYPE "public"."enum_projects_access_level";
  DROP TYPE "public"."enum_projects_status";
  DROP TYPE "public"."enum__projects_v_version_placeholder_art";
  DROP TYPE "public"."enum__projects_v_version_listing_visibility";
  DROP TYPE "public"."enum__projects_v_version_access_level";
  DROP TYPE "public"."enum__projects_v_version_status";
  DROP TYPE "public"."enum_comics_listing_visibility";
  DROP TYPE "public"."enum_comics_access_level";
  DROP TYPE "public"."enum_comics_status";
  DROP TYPE "public"."enum__comics_v_version_listing_visibility";
  DROP TYPE "public"."enum__comics_v_version_access_level";
  DROP TYPE "public"."enum__comics_v_version_status";
  DROP TYPE "public"."enum_chapters_listing_visibility";
  DROP TYPE "public"."enum_chapters_access_level";
  DROP TYPE "public"."enum_chapters_status";
  DROP TYPE "public"."enum__chapters_v_version_listing_visibility";
  DROP TYPE "public"."enum__chapters_v_version_access_level";
  DROP TYPE "public"."enum__chapters_v_version_status";
  DROP TYPE "public"."enum_characters_listing_visibility";
  DROP TYPE "public"."enum_characters_access_level";
  DROP TYPE "public"."enum_characters_status";
  DROP TYPE "public"."enum__characters_v_version_listing_visibility";
  DROP TYPE "public"."enum__characters_v_version_access_level";
  DROP TYPE "public"."enum__characters_v_version_status";
  DROP TYPE "public"."enum_project_updates_listing_visibility";
  DROP TYPE "public"."enum_project_updates_access_level";
  DROP TYPE "public"."enum_project_updates_status";
  DROP TYPE "public"."enum__project_updates_v_version_listing_visibility";
  DROP TYPE "public"."enum__project_updates_v_version_access_level";
  DROP TYPE "public"."enum__project_updates_v_version_status";
  DROP TYPE "public"."enum_tracker_items_kind";
  DROP TYPE "public"."enum_tracker_items_listing_visibility";
  DROP TYPE "public"."enum_tracker_items_access_level";
  DROP TYPE "public"."enum_tracker_items_status";
  DROP TYPE "public"."enum__tracker_items_v_version_kind";
  DROP TYPE "public"."enum__tracker_items_v_version_listing_visibility";
  DROP TYPE "public"."enum__tracker_items_v_version_access_level";
  DROP TYPE "public"."enum__tracker_items_v_version_status";
  DROP TYPE "public"."enum_galleries_listing_visibility";
  DROP TYPE "public"."enum_galleries_access_level";
  DROP TYPE "public"."enum_galleries_status";
  DROP TYPE "public"."enum__galleries_v_version_listing_visibility";
  DROP TYPE "public"."enum__galleries_v_version_access_level";
  DROP TYPE "public"."enum__galleries_v_version_status";
  DROP TYPE "public"."enum_archive_items_listing_visibility";
  DROP TYPE "public"."enum_archive_items_access_level";
  DROP TYPE "public"."enum_archive_items_status";
  DROP TYPE "public"."enum__archive_items_v_version_listing_visibility";
  DROP TYPE "public"."enum__archive_items_v_version_access_level";
  DROP TYPE "public"."enum__archive_items_v_version_status";
  DROP TYPE "public"."enum_media_listing_visibility";
  DROP TYPE "public"."enum_media_access_level";
  DROP TYPE "public"."enum_media_status";
  DROP TYPE "public"."enum__media_v_version_listing_visibility";
  DROP TYPE "public"."enum__media_v_version_access_level";
  DROP TYPE "public"."enum__media_v_version_status";`)
}
