import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory } from "@/components/Directory";
import ContentWriting from "@/components/ContentWriting";
import ContentGallery from "@/components/ContentGallery";
import { CharacterViewerLink } from "@/components/CharacterViewerLink";
import { EquipmentViewerLink } from "@/components/EquipmentViewerLink";
import { getProjectIdentity, getFaction, getFactionContents } from "@/lib/content/queries";

type Props = { params: Promise<{ slug: string; faction: string }> };
export async function generateMetadata({ params }: Props) {
  const ids = await params;
  const project = await getProjectIdentity(ids.slug);
  const faction = project ? await getFaction(project.id, ids.faction) : undefined;
  return { title: faction?.name ?? await lockedPageTitle({ projectSlug: ids.slug, kind: "factions", slug: ids.faction }) };
}
export default async function FactionPage({ params }: Props) {
  const ids = await params;
  const project = await getProjectIdentity(ids.slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: ids.slug, kind: "factions", slug: ids.faction });
  const faction = await getFaction(project.id, ids.faction);
  if (!faction) return lockedPageOrNotFound({ projectSlug: ids.slug, kind: "factions", slug: ids.faction });
  const contents = await getFactionContents(project.id, faction.id);
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/FACTIONS/${faction.slug.toUpperCase()}/`} title={faction.name}>
    <Link className="section-link" href={`/projects/${project.slug}/factions`}>RETURN TO FACTIONS</Link>
    <p className="eyebrow">{project.title} / {faction.type}{faction.status ? ` / ${faction.status}` : ''} / UPDATED <time dateTime={faction.updatedAt}>{faction.updatedAt.slice(0, 10)}</time></p>
    <p className="lede">{faction.description}</p>
    {faction.emblemImage && <ContentGallery images={[faction.emblemImage]} />}
    <ContentWriting data={faction.writing} />
    <section className="section-block"><h2>CHARACTERS</h2>
      <div className="directory-list desktop-file-list">{contents.characters.map(character => <CharacterViewerLink key={character.slug} project={project} character={character} />)}</div>
      {!contents.characters.length && <p>No public characters assigned to this faction.</p>}
    </section>
    <section className="section-block"><h2>EQUIPMENT</h2>
      <div className="directory-list desktop-file-list">{contents.equipment.map(equipment => <EquipmentViewerLink key={equipment.slug} project={project} equipment={equipment} />)}</div>
      {!contents.equipment.length && <p>No public equipment assigned to this faction.</p>}
    </section>
  </Directory>;
}
