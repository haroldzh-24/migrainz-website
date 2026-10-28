"use client";
import { useState } from 'react';
import type { ComicPage } from '@/lib/content/types';
import { useBeforeWorkspace } from '@/components/WindowManager';

export default function DirectoryThumbnail({ image, label, eager = false, schematic = false }: { image?: ComicPage; label: string; eager?: boolean; schematic?: boolean }) {
  const sources = image && !image.classification ? [...new Set([image.thumbnailSrc, ...(image.sources ?? []), image.src].filter((src): src is string => Boolean(src) && !/\.pdf(?:\?|$)/i.test(src!)))] : [];
  const [failed, setFailed] = useState<string[]>([]);
  const hidden = useBeforeWorkspace(); // a route window's hidden first copy: never fetch from there
  const src = sources.find(source => !failed.includes(source));
  return <span className="directory-thumbnail">{src ? <img data-schematic={schematic || undefined} src={src} alt={image?.alt || `${label} artwork`} loading={eager && !hidden ? "eager" : "lazy"} onError={() => setFailed(current => [...current, src])} /> : <span className="thumbnail-unavailable">NO IMAGE<br />FILE UNAVAILABLE</span>}</span>;
}
