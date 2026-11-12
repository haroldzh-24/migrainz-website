import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory, DirectoryLink } from "@/components/Directory";
import ContentWriting from "@/components/ContentWriting";
import ContentGallery from "@/components/ContentGallery";
import { getProject, getCharacterEquipment, getProjectIdentity, getLoreIndex } from "@/lib/content/queries";
import { createLoreLinker } from "@/lib/content/lore";
import { LoreLayout, LoreReferences, LoreText } from "@/components/LoreText";
import EquipmentCards from "@/components/EquipmentCards";
import { projectHref, chapterHref } from "@/lib/content/types";
import { CharacterViewerButton } from "@/components/CharacterViewerLink";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; character: string }>;
}) {
  const ids = await params;
  return {
    title:
      (await getProject(ids.slug))?.characters.find((c) => c.slug === ids.character && !c.classification)
        ?.name ?? await lockedPageTitle({ projectSlug: ids.slug, kind: "characters", slug: ids.character }),
  };
}
export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string; character: string }>;
}) {
  const ids = await params;
  const project = await getProject(ids.slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: ids.slug, kind: "characters", slug: ids.character });
  const character = project.characters.find((c) => c.slug === ids.character && !c.classification);
  if (!character) return lockedPageOrNotFound({ projectSlug: ids.slug, kind: "characters", slug: ids.character });
  const [equipment, identity] = await Promise.all([getCharacterEquipment(ids.slug, ids.character), getProjectIdentity(ids.slug)]);
  // Lore links (board 8): public characters, factions and equipment of this project, never this record itself.
  const lore = createLoreLinker(identity ? await getLoreIndex(identity.id) : [], { self: `character:${character.slug}` });
  const description = lore.text(character.description);
  const writing = lore.writing(character.writing);
  const appearsIn = project.chapters.filter((c) => !c.classification && character.chapterSlugs.includes(c.slug))
    .map((c) => ({ label: typeof c.chapterNumber === "number" ? `${project.title} ch. ${String(c.chapterNumber).padStart(2, "0")}` : c.title, href: chapterHref(project, c) }));
  const references = lore.used();
  return (
    <Directory
      path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/CHARACTERS/${character.slug.toUpperCase()}`}
      title={character.name}
    >
      <Link
        className="section-link"
        href={`${projectHref(project)}/characters`}
      >
        ← CHARACTER DIRECTORY
      </Link>
      <CharacterViewerButton project={project} character={{ slug: character.slug, name: character.name, role: character.role, description: character.description, images: character.images }} />
      <div className="split character-record">
        {character.images.length ? <ContentGallery images={character.images} /> : <div
          className={`record-image ${project.art}`}
          role="img"
          aria-label="Geometric placeholder for character artwork"
        >
          <span>CHARACTER ART / PLACEHOLDER</span>
        </div>}
        <div>
          <p className="eyebrow">{character.role}</p>
          <LoreLayout aside={references.length || appearsIn.length ? <LoreReferences entries={references} appearsIn={appearsIn} /> : null}>
            <p className="lede"><LoreText segments={description} /></p>
            <ContentWriting data={writing} />
          </LoreLayout>
          <p>RECORD STATUS: PUBLIC</p>
        </div>
      </div>
      <EquipmentCards projectSlug={project.slug} equipment={equipment} />
      <h2>RELATED COMIC CHAPTERS</h2>
      <div className="directory-list">
        {project.chapters
          .filter((c) => character.chapterSlugs.includes(c.slug))
          .map((chapter) => (
            <DirectoryLink
              key={chapter.slug}
              classification={chapter.classification} safeLabel={chapter.safeLabel}
              href={chapterHref(project, chapter)}
              name={chapter.title}
              meta="OPEN READER"
            />
          ))}
      </div>
      <Link className="section-link" href={projectHref(project)}>
        ← RETURN TO {project.title}
      </Link>
    </Directory>
  );
}
