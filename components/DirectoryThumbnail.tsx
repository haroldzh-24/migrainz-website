"use client";
import { useState } from 'react';
import type { ComicPage } from '@/lib/content/types';

export default function DirectoryThumbnail({ image, label }: { image?: ComicPage; label: string }) {
  const sources = image && !image.classification ? [...new Set([image.thumbnailSrc, ...(image.sources ?? []), image.src].filter((src): src is string => Boolean(src) && !/\.pdf(?:\?|$)/i.test(src!)))] : [];
  const [failed, setFailed] = useState<string[]>([]);
  const src = sources.find(source => !failed.includes(source));
  return <span className="directory-thumbnail">{src ? <img src={src} alt={image?.alt || `${label} artwork`} loading="lazy" onError={() => setFailed(current => [...current, src])} /> : <span className="thumbnail-unavailable">NO IMAGE<br />FILE UNAVAILABLE</span>}</span>;
}
