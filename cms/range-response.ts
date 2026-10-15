// Single byte ranges cover native media playback. Unsupported multipart ranges
// are ignored (a legal full response), rather than constructing multipart bodies.
export function byteRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | undefined {
  if (!header || !header.startsWith('bytes=') || header.includes(',')) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || size === 0) return 'invalid';
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if ((first !== undefined && !Number.isSafeInteger(first)) || (last !== undefined && !Number.isSafeInteger(last))) return 'invalid';
  const start = first ?? Math.max(0, size - (last ?? 0));
  const end = first === undefined || last === undefined ? size - 1 : Math.min(last, size - 1);
  if (start >= size || start > end || (first === undefined && last === 0)) return 'invalid';
  return { start, end };
}

export function sliceStream(stream: ReadableStream<Uint8Array>, start: number, end: number): ReadableStream<Uint8Array> {
  const reader = stream.getReader();
  let position = 0;
  return new ReadableStream({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { controller.close(); return; }
          const offset = position;
          position += value.length;
          if (position <= start) continue;
          controller.enqueue(value.subarray(Math.max(0, start - offset), Math.min(value.length, end + 1 - offset)));
          if (position > end) { controller.close(); await reader.cancel(); }
          return;
        }
      } catch (error) { controller.error(error); }
    },
    cancel(reason) { return reader.cancel(reason); },
  });
}

export async function privateFileResponse(stream: ReadableStream<Uint8Array>, size: number, type: string, request: { headers?: Headers; method?: string }, headers: Headers) {
  headers.set('Content-Type', type);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(size));
  if (type.includes('svg')) headers.set('Content-Security-Policy', "script-src 'none'");
  if (request.method === 'HEAD') { await stream.cancel(); return new Response(null, { headers }); }
  // Without validators, If-Range requests safely receive the full current file.
  const range = byteRange(request.headers?.has('if-range') ? null : request.headers?.get('range') ?? null, size);
  if (range === 'invalid') {
    await stream.cancel();
    headers.set('Content-Range', `bytes */${size}`);
    headers.set('Content-Length', '0');
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    headers.set('Content-Length', String(range.end - range.start + 1));
    return new Response(sliceStream(stream, range.start, range.end), { status: 206, headers });
  }
  return new Response(stream, { headers });
}
