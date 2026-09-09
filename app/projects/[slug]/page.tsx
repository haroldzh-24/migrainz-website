import { notFound } from "next/navigation";
import { Directory, DirectoryLink } from "@/components/Directory";
import ProjectTracker from "@/components/ProjectTracker";
import {
  getProject,
  projects,
  projectHref,
  chapterHref,
} from "@/data/projects";
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = getProject((await params).slug);
  return { title: project?.title ?? "Record not found" };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = getProject((await params).slug);
  if (!project) notFound();
  return (
    <Directory
      path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/`}
      title={project.title}
    >
      <p className="eyebrow">
        {project.id} / {project.status} / UPDATED{" "}
        <time dateTime={project.updated}>{project.updated}</time>
      </p>
      <p className="lede">{project.description}</p>
      <div className="directory-list">
        <DirectoryLink
          href={`${projectHref(project)}/characters`}
          name="CHARACTERS/"
          meta={`${project.characters.length} RECORDS`}
        />
        {project.chapters.map((chapter) => (
          <DirectoryLink
            key={chapter.slug}
            href={chapterHref(project, chapter)}
            name={chapter.title}
            meta={`${chapter.pages.length} SAMPLE PAGES`}
          />
        ))}
        <DirectoryLink
          href="#production"
          name="PRODUCTION NOTES / CHANGELOG"
          meta={`${project.notes.length} ENTRIES`}
        />
        {["ARTWORK", "ENVIRONMENTS", "DEVELOPMENT"].map((folder) => (
          <div className="directory-row" key={folder}>
            <span>—</span>
            <strong>{folder}/</strong>
            <span>AWAITING FILES</span>
          </div>
        ))}
      </div>
      <section id="production" className="section-block">
        <h2>PRODUCTION / CHANGELOG</h2>
        {project.phases.length ? (
          <ProjectTracker project={project} />
        ) : (
          <p>No production updates filed yet.</p>
        )}
        <div className="production-notes">
          {project.notes.map((note) => (
            <p key={note.date}>
              <time dateTime={note.date}>{note.date}</time> // {note.text}
            </p>
          ))}
        </div>
      </section>
    </Directory>
  );
}
