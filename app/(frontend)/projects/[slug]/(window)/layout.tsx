import type { ReactNode } from 'react';
import RouteApplication from '@/components/RouteApplication';
import { projectSections } from '@/lib/content/project-nav';

// The project window around every project page except the equipment directory, which sits outside it on a terminal page
// (design canvas board 22; app/(frontend)/projects/[slug]/equipment/page.tsx).
export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sections = await projectSections(slug);
  if (!sections) return <RouteApplication id="project" title="PROJECT: CLASSIFIED">{children}</RouteApplication>;
  return <RouteApplication key={slug} id="project" title={`PROJECT: ${sections.project.title}`} navigation={sections.navigation}>{children}</RouteApplication>;
}
