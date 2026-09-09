import type { ComponentProps } from 'react';
import type { RichText } from '@payloadcms/richtext-lexical/react';

export type Writing = ComponentProps<typeof RichText>['data'];
export type ComicPage = { src: string; alt: string; caption?: string; width?: number; height?: number };
export type Chapter = { slug: string; title: string; description: string; pages: ComicPage[] };
export type Gallery = { slug: string; title: string; description: string; images: ComicPage[] };
export type Character = {
  slug: string; name: string; role: string; description: string; chapterSlugs: string[];
  writing?: Writing | null; images: ComicPage[];
};
export type Project = {
  slug: string; id: string; title: string; category: string; status: string; art: string;
  summary: string; description: string; updated: string; writing?: Writing | null;
  hero?: ComicPage; galleries: Gallery[];
  phases: { label: string; percent: number }[];
  milestones: { title: string; status: string }[];
  notes: { date: string; text: string; title?: string; writing?: Writing | null; images?: ComicPage[] }[];
  characters: Character[]; chapters: Chapter[];
};
export const projectHref = (project: Pick<Project, 'slug'>) => `/projects/${project.slug}`;
export const chapterHref = (project: Pick<Project, 'slug'>, chapter: Pick<Chapter, 'slug'>) => `/comics/${project.slug}/${chapter.slug}`;
