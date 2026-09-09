import Link from "next/link";
import { notFound } from "next/navigation";
import { Directory, DirectoryLink } from "@/components/Directory";
import { getProject, projectHref } from "@/data/projects";
export const metadata = { title: "Characters" };
export default async function CharactersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  return (
    <Directory
      path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/CHARACTERS/`}
      title="CHARACTERS"
    >
      <Link className="section-link" href={projectHref(project)}>
        ← RETURN TO {project.title}
      </Link>
      <div className="directory-list">
        {project.characters.map((character) => (
          <DirectoryLink
            key={character.slug}
            href={`${projectHref(project)}/characters/${character.slug}`}
            name={character.name}
            meta={character.role}
          />
        ))}
      </div>
      {!project.characters.length && <p>No character records filed yet.</p>}
    </Directory>
  );
}
