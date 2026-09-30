import { Directory } from '@/components/Directory';
import { EquipmentViewerLink } from '@/components/EquipmentViewerLink';
import { lockedPageOrNotFound } from '@/components/LockedContentPage';
import { getProjectIdentity, getEquipmentDirectory } from '@/lib/content/queries';

export default async function EquipmentDirectory({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectIdentity(slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: slug });
  const equipment = await getEquipmentDirectory(project.id);
  return <Directory path={`SYS:/PROJECTS/${slug.toUpperCase()}/EQUIPMENT/`} title="EQUIPMENT">
    <div className="directory-list desktop-file-list">{equipment.map(item => <EquipmentViewerLink key={item.slug} project={project} equipment={item} />)}</div>
    {!equipment.length && <p>No equipment records filed yet.</p>}
  </Directory>;
}
