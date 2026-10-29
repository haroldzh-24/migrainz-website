import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory } from "@/components/Directory";
import ContentGallery from "@/components/ContentGallery";
import { EquipmentViewerButton } from "@/components/EquipmentViewerLink";
import { getProjectIdentity, getEquipment } from "@/lib/content/queries";
import EquipmentSchematic from "@/components/EquipmentSchematic";
import EquipmentSpecifications from "@/components/EquipmentSpecifications";

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
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/EQUIPMENT/${equipment.slug.toUpperCase()}`} title={equipment.name} compact>
    <Link className="section-link" href={`/projects/${project.slug}/equipment`}>RETURN TO EQUIPMENT</Link>
    <EquipmentSchematic key={equipment.slug + equipment.schematic?.src + equipment.schematic?.poster} {...equipment.schematic} name={equipment.name}>
      <p className="eyebrow">{equipment.category && `${equipment.category} / `}UPDATED <time dateTime={equipment.updated}>{equipment.updated}</time></p>
      {equipment.description && <p className="lede">{equipment.description}</p>}
      <EquipmentSpecifications rows={equipment.specifications} />
    </EquipmentSchematic>
    <EquipmentViewerButton project={project} equipment={equipment} />
    <ContentGallery images={equipment.images} />
    {equipment.characters.length > 0 && <section aria-label="Assigned characters"><h2>ASSIGNED CHARACTERS</h2><div className="directory-list">
      {equipment.characters.map(character => <Link className="directory-row" key={character.slug} href={`/projects/${project.slug}/characters/${character.slug}`}><strong>{character.name}</strong><span>{character.role}</span></Link>)}
    </div></section>}
  </Directory>;
}
