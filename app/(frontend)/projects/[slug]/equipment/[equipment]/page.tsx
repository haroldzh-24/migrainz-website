import Link from "next/link";
import { notFound } from "next/navigation";
import { Directory } from "@/components/Directory";
import ContentGallery from "@/components/ContentGallery";
import { AccessPlaceholder, ContentSections } from "@/components/PublicContent";
import { EquipmentViewerButton } from "@/components/EquipmentViewerLink";
import { getProjectIdentity, getEquipment } from "@/lib/content/queries";

type Props = { params: Promise<{ slug: string; equipment: string }> };
export async function generateMetadata({ params }: Props) {
  const ids = await params;
  const project = await getProjectIdentity(ids.slug);
  return { title: project ? (await getEquipment(project.id, ids.equipment))?.name ?? "Record not found" : "Record not found" };
}
export default async function EquipmentPage({ params }: Props) {
  const ids = await params;
  const project = await getProjectIdentity(ids.slug);
  if (!project) notFound();
  const equipment = await getEquipment(project.id, ids.equipment);
  if (!equipment) notFound();
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/EQUIPMENT/${equipment.slug.toUpperCase()}`} title={equipment.name}>
    <Link className="section-link" href={`/projects/${project.slug}/factions`}>RETURN TO FACTIONS</Link>
    {equipment.access?.state !== "public" ? <AccessPlaceholder access={equipment.access} kind="art" /> : <>
    <EquipmentViewerButton project={project} equipment={equipment} />
    <p className="eyebrow">{equipment.category} / UPDATED <time dateTime={equipment.updated}>{equipment.updated}</time></p>
    <p className="lede">{equipment.description}</p>
    <ContentGallery images={equipment.images} />
    <ContentSections sections={equipment.sections} />
    </>}
  </Directory>;
}
