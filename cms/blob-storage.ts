import { readFile } from 'node:fs/promises';
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import type { Adapter } from '@payloadcms/plugin-cloud-storage/types';
import { del, get, put } from '@vercel/blob';
import type { Plugin } from 'payload';
import { blobPathname } from './blob-files';

const sdk = { del, get, put };

// Payload 3.88's Vercel adapter is public-only. Use its installed cloud-storage
// lifecycle with the official SDK's private operations; never publish Blob URLs.
export function privateBlobAdapter(token: string, client = sdk): Adapter {
  return () => ({
    name: 'studio-private-vercel-blob',
    async handleUpload({ file }) {
      const bytes = file.tempFilePath && !file.buffer.length ? await readFile(file.tempFilePath) : file.buffer;
      await client.put(blobPathname(file.filename), bytes, {
        token, access: 'private', addRandomSuffix: false, allowOverwrite: true,
        contentType: file.mimeType, cacheControlMaxAge: 60,
      });
      // No returned metadata: IDs, filenames, sizes and relationships stay Payload-owned.
    },
    async handleDelete({ filename }) {
      await client.del(blobPathname(filename), { token });
    },
    async staticHandler(req, { params: { filename } }) {
      // Payload checks mediaRead first, then the existing original-image guard,
      // then this handler. Never redirect to a Blob URL or fall back to /tmp.
      const headers = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'X-Content-Type-Options': 'nosniff' });
      let pathname: string;
      try { pathname = blobPathname(filename); }
      catch { return new Response(null, { status: 404, headers }); }
      try {
        const result = await client.get(pathname, { token, access: 'private', useCache: false });
        if (!result || result.statusCode !== 200) return new Response(null, { status: 404, headers });
        headers.set('Content-Type', result.blob.contentType);
        headers.set('Content-Length', String(result.blob.size));
        if (result.blob.contentType.includes('svg')) headers.set('Content-Security-Policy', "script-src 'none'");
        return new Response(result.stream, { headers });
      } catch {
        // Keep credential/provider details out of responses and logs. Image onError
        // can advance to the next candidate on this non-success response.
        req.payload.logger.error('Private Media Blob read failed. Check store access and configuration.');
        return new Response(null, { status: 502, headers });
      }
    },
  });
}

export function blobStoragePlugin(env: NodeJS.ProcessEnv = process.env): Plugin {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    if (env.VERCEL === '1') throw new Error('BLOB_READ_WRITE_TOKEN is required on Vercel; refusing ephemeral Media storage.');
    return config => config;
  }
  return cloudStoragePlugin({
    collections: {
      media: {
        adapter: privateBlobAdapter(token), disableLocalStorage: true,
        // Do not set disablePayloadAccessControl, prefix or alwaysInsertFields.
        // The existing API URL stays stable; no new database fields are needed.
        generateFileURL: ({ filename }) => `/api/media/file/${encodeURIComponent(filename)}`,
      },
    },
  });
}
