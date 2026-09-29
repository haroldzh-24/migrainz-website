import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory } from "@/components/Directory";
import ContentGallery from "@/components/ContentGallery";
import { EquipmentViewerButton } from "@/components/EquipmentViewerLink";
import { getProjectIdentity, getEquipment } from "@/lib/content/queries";

type Props = { params: Promise<{ slug: string; equipment: string }> };
export async function generateMetadata({ params }: Props) {
  const ids = await params;
  const project = await getProjectIdentity(ids.slug);
  const equipment = project ? await getEquipment(project.id, ids.equipment) : undefined;
  return { title: equipment?.name ?? await lockedPageTitle({ projectSlug: ids.slug, kind: "equipment", slug: ids.equipment }) };
}
export default async function EquipmentPage({ params }: Props) {
  const ids = await params;
  const project = await getProjectIdentity(ids.slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: ids.slug, kind: "equipment", slug: ids.equipment });
  const equipment = await getEquipment(project.id, ids.equipment);
  if (!equipment) return lockedPageOrNotFound({ projectSlug: ids.slug, kind: "equipment", slug: ids.equipment });
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/EQUIPMENT/${equipment.slug.toUpperCase()}`} title={equipment.name}>
    <Link className="section-link" href={`/projects/${project.slug}/factions`}>RETURN TO FACTIONS</Link>
    <EquipmentViewerButton project={project} equipment={equipment} />
    <p className="eyebrow">{equipment.category} / UPDATED <time dateTime={equipment.updated}>{equipment.updated}</time></p>
    <p className="lede">{equipment.description}</p>
    <ContentGallery images={equipment.images} />
  </Directory>;
}
