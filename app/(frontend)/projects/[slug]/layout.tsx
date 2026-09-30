import type { ReactNode } from 'react';
import RouteApplication from '@/components/RouteApplication';
import { getProject, getProjectIdentity, getFactions, getEquipmentDirectory } from '@/lib/content/queries';

export default async function ProjectLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [project, identity] = await Promise.all([getProject(slug), getProjectIdentity(slug)]);
  if (!project || !identity) return <RouteApplication id="project" title="PROJECT: CLASSIFIED">{children}</RouteApplication>;
  const [factions, equipment] = await Promise.all([getFactions(identity.id), getEquipmentDirectory(identity.id)]);
  const base = `/projects/${project.slug}`;
  const navigation = [{ label: 'OVERVIEW', href: base },
    ...(factions.length ? [{ label: 'FACTIONS', href: `${base}/factions` }] : []),
    ...(project.characters.length ? [{ label: 'CHARACTERS', href: `${base}/characters` }] : []),
    ...(equipment.length ? [{ label: 'EQUIPMENT', href: `${base}/equipment` }] : []),
    ...(project.writing ? [{ label: 'WRITING', href: `${base}#writing` }] : []),
    ...(project.galleries.length ? [{ label: 'GALLERY', href: `${base}#gallery-${project.galleries[0].slug}` }] : [])];
  return <RouteApplication key={slug} id="project" title={`PROJECT: ${project.title}`} navigation={navigation}>{children}</RouteApplication>;
}
