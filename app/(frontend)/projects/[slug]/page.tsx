import { notFound } from "next/navigation";
import { Directory, DirectoryLink } from "@/components/Directory";
import ProjectTracker from "@/components/ProjectTracker";
import ContentWriting from "@/components/ContentWriting";
import ContentGallery from "@/components/ContentGallery";
import { getProject, getArchiveItems } from "@/lib/content/queries";
import { projectHref, chapterHref } from "@/lib/content/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  return { title: project?.title ?? "Record not found" };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const archiveItems = (await getArchiveItems()).filter(item => item.projectSlug === project.slug);
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
      {project.hero && <ContentGallery images={[project.hero]} />}
      <ContentWriting data={project.writing} />
      {archiveItems.length > 0 && <div className="directory-list">
        {archiveItems.map(item => <DirectoryLink key={item.slug} href={`/archive#item-${item.slug}`} name={item.title} meta="ARCHIVE RECORD" />)}
      </div>}
      {project.galleries.map((gallery) => (
        <section className="section-block" key={gallery.slug}>
          <h2>{gallery.title}</h2><p>{gallery.description}</p>
          <ContentGallery images={gallery.images} />
        </section>
      ))}
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
            meta={`${chapter.pages.length} PAGES`}
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
          {project.notes.map((note, index) => (
            <div key={`${note.date}-${index}`}>
            <p>
              <time dateTime={note.date}>{note.date}</time> // {note.text}
            </p>
            <ContentWriting data={note.writing} />
            <ContentGallery images={note.images ?? []} />
            </div>
          ))}
        </div>
      </section>
    </Directory>
  );
}
