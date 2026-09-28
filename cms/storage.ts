import { s3Storage } from '@payloadcms/storage-s3';
import type { Plugin } from 'payload';
import { staff } from './access';

const enabled = process.env.CMS_STORAGE === 's3';
if (process.env.CMS_STORAGE && !['local', 's3'].includes(process.env.CMS_STORAGE)) {
  throw new Error('CMS_STORAGE must be local (development only) or s3.');
}
if (enabled) {
  const missing = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].filter(name => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing storage environment variables: ${missing.join(', ')}`);
}

// Always install the same nullable prefix field, even in local development.
// Keep Payload URLs and read authorization; never expose public bucket URLs.
const installStorage = s3Storage({
  enabled,
  alwaysInsertFields: true,
  bucket: process.env.S3_BUCKET || 'disabled-local-storage',
  collections: { media: true }, // Access control stays enabled (the default).
  clientUploads: { access: ({ req }) => staff({ req }) },
  signedDownloads: false,
  config: {
    region: process.env.S3_REGION || 'auto',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID || '', secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' },
  },
});

export const mediaStorage: Plugin = async config => {
  const configured = await installStorage(config);
  const media = configured.collections?.find(collection => collection.slug === 'media');
  if (enabled && media && typeof media.upload === 'object') {
    // In 3.88 the S3 handler can prefer an arbitrary query prefix or re-read a
    // newer draft. Pin anonymous downloads to the access-checked document.
    media.upload.handlers = media.upload.handlers?.map(handler => (req, args) => {
      const doc = args.doc as { prefix?: string | null } | null | undefined;
      return handler(req, doc ? { ...args, params: { ...args.params, prefix: doc.prefix || '' } } : args);
    });
  }
  return configured;
};
