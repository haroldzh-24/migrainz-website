import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory } from "@/components/Directory";
import ContentGallery from "@/components/ContentGallery";
import { EquipmentViewerButton } from "@/components/EquipmentViewerLink";
import { getProjectIdentity, getEquipment } from "@/lib/content/queries";
import EquipmentSchematic from "@/components/EquipmentSchematic";
import { Dossier, DossierCards } from "@/components/Dossier";

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
  const file = `${equipment.name.replace(/\s+/g, "_")}.EQP`;
  const schematic = equipment.schematic;
  const hasSchematic = Boolean(schematic?.src || schematic?.poster);
  // Board 3: the schematic loop on the left (its frame follows the poster's ratio, so a vertical weapon gets a tall
  // frame); without one, the first concept image; without either, an empty frame.
  const media = hasSchematic
    ? <figure className="dossier-figure">
        <EquipmentSchematic key={equipment.slug + schematic?.src + schematic?.poster} {...schematic} name={equipment.name} />
        <figcaption>SCHEMATIC · {file}</figcaption>
      </figure>
    : equipment.images.length
      ? <ContentGallery images={equipment.images.slice(0, 1)} />
      : <div className="dossier-empty-frame" role="img" aria-label={`No schematic or artwork filed for ${equipment.name}`}><span>NO SCHEMATIC FILED</span></div>;
  const gallery = hasSchematic ? equipment.images : equipment.images.slice(1);
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/EQUIPMENT/${equipment.slug.toUpperCase()}`} title={equipment.name} compact heading={false}>
    <Link className="section-link" href={`/projects/${project.slug}/equipment`}>RETURN TO EQUIPMENT</Link>
    <Dossier label="Equipment dossier" media={media} file={file} code={project.projectCode || undefined} name={equipment.name}
      fieldsCaption="TECHNICAL SPECIFICATIONS"
      fields={[
        ...(equipment.category ? [{ label: "CATEGORY", value: equipment.category }] : []),
        ...equipment.specifications.map(row => ({ label: row.label, value: row.value })),
        { label: "UPDATED", value: <time dateTime={equipment.updated}>{equipment.updated}</time> },
      ]}
      actions={<EquipmentViewerButton project={project} equipment={equipment} />}
      below={<DossierCards title="ISSUED TO" label="Issued to" cards={equipment.characters.map(character => ({
        key: character.slug, href: `/projects/${project.slug}/characters/${character.slug}`, name: character.name, image: character.portrait,
        line: [character.designation || character.role, character.quantity != null ? `×${character.quantity}` : ""].filter(Boolean).join(" · ") || undefined,
      }))} />}>
      {equipment.description && <p className="lede dossier-description">{equipment.description}</p>}
    </Dossier>
    <ContentGallery images={gallery} />
  </Directory>;
}
