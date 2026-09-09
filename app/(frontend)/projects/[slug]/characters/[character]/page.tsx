import Link from "next/link";
import { notFound } from "next/navigation";
import { Directory, DirectoryLink } from "@/components/Directory";
import ContentWriting from "@/components/ContentWriting";
import ContentGallery from "@/components/ContentGallery";
import { getProject } from "@/lib/content/queries";
import { projectHref, chapterHref } from "@/lib/content/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; character: string }>;
}) {
  const ids = await params;
  return {
    title:
      (await getProject(ids.slug))?.characters.find((c) => c.slug === ids.character)
        ?.name ?? "Record not found",
  };
}
export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string; character: string }>;
}) {
  const ids = await params;
  const project = await getProject(ids.slug);
  if (!project) notFound();
  const character = project.characters.find((c) => c.slug === ids.character);
  if (!character) notFound();
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
          <p className="lede">{character.description}</p>
          <ContentWriting data={character.writing} />
          <p>RECORD STATUS: PUBLIC</p>
        </div>
      </div>
      <h2>RELATED COMIC CHAPTERS</h2>
      <div className="directory-list">
        {project.chapters
          .filter((c) => character.chapterSlugs.includes(c.slug))
          .map((chapter) => (
            <DirectoryLink
              key={chapter.slug}
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
