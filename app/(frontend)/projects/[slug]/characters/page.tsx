import Link from "next/link";
import { notFound } from "next/navigation";
import { Directory } from "@/components/Directory";
import { getProject } from "@/lib/content/queries";
import { projectHref } from "@/lib/content/types";
import { CharacterViewerLink } from "@/components/CharacterViewerLink";
export const metadata = { title: "Characters" };
export default async function CharactersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  return (
    <Directory
      path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/CHARACTERS/`}
      title="CHARACTERS"
    >
      <Link className="section-link" href={projectHref(project)}>
        ← RETURN TO {project.title}
      </Link>
      <div className="directory-list desktop-file-list">
        {project.characters.map((character) => (
          <CharacterViewerLink
            key={character.slug}
            project={{ slug: project.slug, title: project.title }}
            character={{ slug: character.slug, name: character.name, role: character.role, description: character.description, images: character.images, updated: character.updated }}
          />
        ))}
      </div>
      {!project.characters.length && <p>No character records filed yet.</p>}
    </Directory>
  );
}
