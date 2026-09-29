import type { ComponentProps } from 'react';
import type { RichText } from '@payloadcms/richtext-lexical/react';

export type Writing = ComponentProps<typeof RichText>['data'];
export type Classification = 'redacted' | 'patron';
export type Classified = { classification?: Classification; safeLabel?: string };
export type ComicPage = Classified & { src: string; viewerSrc?: string; thumbnailSrc?: string; alt: string; caption?: string; width?: number; height?: number };
export type Chapter = Classified & { slug: string; title: string; description: string; pages: ComicPage[]; chapterNumber?: number; comicTitle?: string };
export type Gallery = Classified & { slug: string; title: string; description: string; images: ComicPage[] };
export type Character = Classified & {
  slug: string; name: string; role: string; description: string; chapterSlugs: string[];
  writing?: Writing | null; images: ComicPage[]; updated?: string;
};
export type Project = Classified & {
  slug: string; id: string; title: string; category: string; status: string; art: string;
  summary: string; description: string; updated: string; writing?: Writing | null;
  hero?: ComicPage; galleries: Gallery[];
  phases: (Classified & { label: string; percent: number })[];
  milestones: (Classified & { title: string; status: string })[];
  notes: (Classified & { date: string; text: string; title?: string; writing?: Writing | null; images?: ComicPage[]; listingOrder?: number })[];
  characters: Character[]; chapters: Chapter[];
};
export const projectHref = (project: Pick<Project, 'slug'>) => `/projects/${project.slug}`;
export const chapterHref = (project: Pick<Project, 'slug'>, chapter: Pick<Chapter, 'slug'>) => `/comics/${project.slug}/${chapter.slug}`;
