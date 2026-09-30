// Opt-in file copy only. Does not load Payload, initialize a DB, or alter records.
// Run with: node --import tsx scripts/recover-blob-media.mjs --records EXPORT.json --media-dir PATH
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { blobPathname } from '../cms/blob-files.ts';

const args = process.argv.slice(2);
const value = name => args[args.indexOf(name) + 1];
const apply = args.includes('--apply');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--apply') continue;
  if (!['--records', '--media-dir', '--confirm-store-id'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
    throw new Error('Usage: --records EXPORT.json --media-dir PATH [--apply --confirm-store-id STORE_ID]');
  }
  i++;
}
if (!args.includes('--records') || !args.includes('--media-dir')) throw new Error('--records and --media-dir are required. Default mode is dry-run.');
const directory = await realpath(value('--media-dir'));
const exported = JSON.parse(await readFile(value('--records'), 'utf8'));
const records = Array.isArray(exported) ? exported : exported.docs;
if (!Array.isArray(records)) throw new Error('Expected a Media JSON array or a Payload { docs: [...] } response.');
if (!Array.isArray(exported) && (exported.hasNextPage || (exported.totalDocs != null && exported.totalDocs !== records.length))) {
  throw new Error('Export is paginated/incomplete. Export all Media records before recovery.');
}

// Construct and validate the entire plan before any Blob write. Only filenames
// recorded in the target Media export are eligible; do not infer new derivatives.
const files = new Map();
for (const record of records) {
  if (record.id == null) throw new Error('Every exported Media record must have its existing ID.');
  const candidates = [{ ...record, kind: 'original' }, ...Object.entries(record.sizes || {}).map(([kind, file]) => ({ ...file, kind }))];
  for (const candidate of candidates) {
    if (!candidate.filename) continue;
    const key = blobPathname(candidate.filename);
    const prior = files.get(key);
    if (prior && prior.id !== record.id) throw new Error(`Ambiguous filename shared by Media ${prior.id} and ${record.id}; reconcile before copying.`);
    let local;
    try { local = await realpath(path.join(directory, candidate.filename)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (local && !local.startsWith(directory + path.sep)) throw new Error('A local media path escapes the specified directory.');
    const info = local ? await stat(local) : undefined;
    if (info && !info.isFile()) throw new Error('Expected a regular local media file.');
    const bytes = local ? await readFile(local) : undefined;
    if (bytes && typeof candidate.filesize === 'number' && bytes.length !== candidate.filesize) {
      throw new Error(`Size mismatch for Media ${record.id}/${candidate.filename}; no files copied.`);
    }
    files.set(key, { id: record.id, kind: candidate.kind, filename: candidate.filename, key, local,
      mimeType: candidate.mimeType, size: bytes?.length, sha256: bytes ? createHash('sha256').update(bytes).digest('hex') : undefined });
  }
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', files: [...files.values()].map(({ local, ...file }) => ({ ...file, localExists: Boolean(local) })) }, null, 2));
if (!apply) {
  console.log('Dry-run complete. No Blob requests or database writes performed.');
} else {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken) throw new Error('Load a fresh VERCEL_OIDC_TOKEN with node --env-file=.env.local. Recovery uses OIDC, not a read/write token.');
  const normalizeStore = id => id?.trim().replace(/^store_/, '');
  const confirmed = args.includes('--confirm-store-id') ? normalizeStore(value('--confirm-store-id')) : undefined;
  if (!confirmed || !/^[a-z\d]+$/i.test(confirmed)) throw new Error('Explicitly select the intended Blob store with --confirm-store-id STORE_ID.');
  const configuredStore = normalizeStore(process.env.BLOB_STORE_ID);
  if (configuredStore && configuredStore !== confirmed) throw new Error('--confirm-store-id does not match BLOB_STORE_ID. No files copied.');
  // OIDC identifies a project, not an embedded Blob store. Explicitly bind every
  // SDK call to the confirmed store; Vercel verifies project/store authorization.
  // Passing oidcToken prevents fallback to any ambient long-lived credential.
  const auth = { oidcToken, storeId: confirmed };
  const { head, put, BlobNotFoundError } = await import('@vercel/blob');
  for (const file of files.values()) {
    if (!file.local) { console.log(`MISSING: Media ${file.id}/${file.filename}`); continue; }
    try {
      await head(file.key, auth);
      console.log(`SKIPPED existing object (not overwritten): Media ${file.id}/${file.filename}`);
      continue;
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) {
        // Do not print SDK errors/causes that could contain authentication data.
        throw new Error('Blob metadata request failed. Check OIDC token freshness, the confirmed store, and linked project access.');
      }
    }
    const bytes = await readFile(file.local);
    if (createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error('A local file changed after planning; copy stopped.');
    try {
      await put(file.key, bytes, { ...auth, access: 'private', addRandomSuffix: false, allowOverwrite: false,
        contentType: file.mimeType, cacheControlMaxAge: 60 });
    } catch {
      throw new Error('Private Blob copy failed. Check OIDC token freshness, store access, and whether the object already exists. Earlier copies, if any, are listed above.');
    }
    console.log(`COPIED: Media ${file.id}/${file.filename}`);
  }
  console.log('Copy finished. No database records or relationships changed.');
}
