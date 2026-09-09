import path from 'node:path';
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor, FixedToolbarFeature } from '@payloadcms/richtext-lexical';
import sharp from 'sharp';
import { ArchiveItems, Characters, Chapters, Comics, Galleries, mediaCollection, Projects, ProjectUpdates, taxonomies, TrackerItems, Users } from './collections';

const database = process.env.CMS_DATABASE;
const url = process.env.DATABASE_URL;
const mediaDirectory = process.env.CMS_MEDIA_DIR;
const secret = process.env.PAYLOAD_SECRET;
if (!secret || secret.length < 32) throw new Error('Set a random PAYLOAD_SECRET of at least 32 characters. Run npm run cms:setup for development.');
if (!url || !mediaDirectory || !database) throw new Error('CMS_DATABASE, DATABASE_URL and CMS_MEDIA_DIR are required. Run npm run cms:setup.');
if (!path.isAbsolute(mediaDirectory) || path.resolve(mediaDirectory) === path.resolve('public') || path.resolve(mediaDirectory).startsWith(path.resolve('public') + path.sep)) {
  throw new Error('CMS_MEDIA_DIR must be an absolute private directory outside public/.');
}
if (process.env.NODE_ENV === 'production' && database !== 'postgres') {
  throw new Error('SQLite is DEVELOPMENT ONLY. Production requires managed PostgreSQL.');
}
if (database === 'postgres' && !/^postgres(?:ql)?:\/\//.test(url)) throw new Error('PostgreSQL requires a postgres:// connection URL.');
if (database !== 'sqlite' && database !== 'postgres') throw new Error('Unknown CMS_DATABASE.');
if (database === 'sqlite' && !url.startsWith('file:')) throw new Error('Development SQLite must use a local file: URL.');

export default buildConfig({
  secret,
  admin: { user: 'users', importMap: { baseDir: path.resolve(/* turbopackIgnore: true */ '.') } },
  db: database === 'postgres'
    ? postgresAdapter({ pool: { connectionString: url }, push: false, migrationDir: path.resolve('migrations/postgres') })
    : sqliteAdapter({ client: { url }, migrationDir: path.resolve('migrations/sqlite') }),
  editor: lexicalEditor({ features: ({ defaultFeatures }) => [
    // Media is attached through explicit fields so file publication can be audited.
    ...defaultFeatures.filter((feature) => !['upload', 'relationship'].includes(feature.key)),
    FixedToolbarFeature(),
  ] }),
  sharp,
  collections: [Users, Projects, Comics, Chapters, Characters, ProjectUpdates, TrackerItems, Galleries, ArchiveItems, mediaCollection(mediaDirectory), ...taxonomies],
  typescript: { outputFile: path.resolve('payload-types.ts') },
  graphQL: { disable: true },
  upload: { limits: { fileSize: 40 * 1024 * 1024 } },
});
