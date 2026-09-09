'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useFormFields } from '@payloadcms/ui';
import './batch-media.css';

type Entry = {
  key: string; file: File; preview: string; alt: string; progress: number;
  state: 'pending' | 'uploading' | 'ready' | 'failed' | 'attached';
  mediaID?: number; error?: string;
};
const sortNames = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function BatchMedia({ targetPath = 'pages' }: { targetPath?: string }) {
  const { addFieldRow, getDataByPath, moveFieldRow, setProcessing } = useForm();
  const rows = useFormFields(([fields]) => fields[targetPath]?.rows);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const cancel = useRef(false);
  const mounted = useRef(true);
  const previews = useRef<string[]>([]);
  const singular = targetPath === 'pages' ? 'page' : 'image';
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel.current = true;
      xhr.current?.abort();
      previews.current.forEach(URL.revokeObjectURL);
    };
  }, []);
  const update = (key: string, patch: Partial<Entry>) => {
    if (mounted.current) setEntries(current => current.map(entry => entry.key === key ? { ...entry, ...patch } : entry));
  };

  async function upload(entry: Entry): Promise<number> {
    // Recover a completed upload after a lost response instead of duplicating it.
    const lookup = await fetch(`/api/media?where[uploadKey][equals]=${encodeURIComponent(entry.key)}&depth=0`, { credentials: 'same-origin' });
    if (!lookup.ok) throw new Error('Could not check uploads. Check your login and retry.');
    const found = await lookup.json();
    if (found.docs?.[0]) return found.docs[0].id;
    if (cancel.current) throw new Error('Upload cancelled.');
    const form = new FormData();
    form.append('file', entry.file);
    form.append('_payload', JSON.stringify({ alt: entry.alt, uploadKey: entry.key, _status: 'published',
      accessLevel: getDataByPath('accessLevel') || 'public', listingVisibility: 'hidden' }));
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      xhr.current = request;
      request.open('POST', '/api/media');
      request.withCredentials = true;
      request.timeout = 120000;
      request.upload.onprogress = event => {
        if (event.lengthComputable) update(entry.key, { progress: Math.min(99, Math.round(event.loaded / event.total * 100)) });
      };
      request.onerror = () => reject(new Error('Network error. Retry this upload.'));
      request.ontimeout = () => reject(new Error('Upload timed out. Retry this upload.'));
      request.onabort = () => reject(new Error('Upload cancelled. You can retry.'));
      request.onload = () => {
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(`Upload failed (${request.status}). Check file size and login, then retry.`)); return;
        }
        try { resolve(JSON.parse(request.responseText).doc.id); }
        catch { reject(new Error('Upload response was incomplete. Retry to recover the file.')); }
      };
      request.send(form);
    });
  }

  async function run(selected: Entry[]) {
    if (busy || !selected.length) return;
    cancel.current = false;
    setBusy(true); setProcessing(true);
    try {
      for (const entry of selected) {
        if (cancel.current || !mounted.current) break;
        update(entry.key, { state: 'uploading', progress: 0, error: undefined });
        try {
          if (!entry.file.type.startsWith('image/')) throw new Error('Choose an image file.');
          if (entry.file.size > 40 * 1024 * 1024) throw new Error('Maximum file size is 40 MB.');
          if (!entry.alt.trim()) throw new Error('Add descriptive alt text before uploading.');
          const mediaID = await upload(entry);
          update(entry.key, { state: 'ready', progress: 100, mediaID });
        } catch (error) { update(entry.key, { state: 'failed', error: error instanceof Error ? error.message : 'Upload failed.' }); }
      }
    } finally {
      xhr.current = null;
      if (mounted.current) { setBusy(false); setProcessing(false); }
    }
  }

  function attach() {
    const ready = entries.filter(entry => entry.state === 'ready');
    const start = rows?.length ?? 0;
    ready.forEach((entry, index) => {
      addFieldRow({ path: targetPath, schemaPath: `${targetPath}`, rowIndex: start + index,
        subFieldState: { media: { value: entry.mediaID, valid: true }, alt: { value: entry.alt, valid: true } } });
      update(entry.key, { state: 'attached' });
    });
  }

  const orderedRows = getDataByPath<{ id?: string; alt?: string }[]>(targetPath) || [];
  return (
    <section className="batch-media" aria-label={`Batch ${singular} upload`}>
      <h3>Add multiple {targetPath}</h3>
      <p>Choose images, review filename order and alt text, upload, then attach. Save draft or publish to keep the list. Unattached uploads remain in Media and are not publicly accessible.</p>
      <label>Choose {targetPath}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" multiple disabled={busy}
          onChange={event => {
            const files = Array.from(event.target.files || []).sort((a, b) => sortNames.compare(a.name, b.name));
            const added = files.map(file => { const preview = URL.createObjectURL(file); previews.current.push(preview);
              return { key: crypto.randomUUID(), file, preview, alt: '', progress: 0, state: 'pending' as const }; });
            setEntries(current => [...current, ...added]); event.target.value = '';
          }} />
      </label>
      <p>Each selection is sorted naturally: 1, 2, 10. After attaching, use the row handles or move buttons to change the final order.</p>
      <ol className="batch-queue">
        {entries.map(entry => <li key={entry.key} data-filename={entry.file.name}>
          <img src={entry.preview} alt="" width={48} height={64} />
          <div><strong>{entry.file.name}</strong>
            <label>Alt text for {entry.file.name}<input value={entry.alt} disabled={busy || ['ready', 'attached'].includes(entry.state)}
              onChange={event => update(entry.key, { alt: event.target.value })} /></label>
            <progress value={entry.progress} max={100} aria-label={`Upload progress for ${entry.file.name}`} />
            <span role="status">{entry.error || entry.state}</span>
            {entry.state === 'failed' && <button type="button" disabled={busy} onClick={() => void run([entry])}>Retry {entry.file.name}</button>}
          </div>
        </li>)}
      </ol>
      <div className="batch-actions">
        <button type="button" disabled={busy || !entries.some(entry => entry.state === 'pending')} onClick={() => void run(entries.filter(entry => entry.state === 'pending'))}>Upload files</button>
        <button type="button" disabled={busy || !entries.some(entry => entry.state === 'ready')} onClick={attach}>Attach uploaded files</button>
        {busy && <button type="button" onClick={() => { cancel.current = true; xhr.current?.abort(); }}>Cancel uploads</button>}
      </div>
      {!!rows?.length && <div className="batch-order"><h4>Current {singular} order</h4>
        <ol>{rows.map((row, index) => <li key={row.id}>
          <span>{orderedRows[index]?.alt || `${singular} ${index + 1}`}</span>
          <button type="button" disabled={busy || index === 0} aria-label={`Move ${singular} ${index + 1} up`}
            onClick={() => moveFieldRow({ path: targetPath, moveFromIndex: index, moveToIndex: index - 1 })}>Up</button>
          <button type="button" disabled={busy || index === rows.length - 1} aria-label={`Move ${singular} ${index + 1} down`}
            onClick={() => moveFieldRow({ path: targetPath, moveFromIndex: index, moveToIndex: index + 1 })}>Down</button>
        </li>)}</ol>
      </div>}
    </section>
  );
}
