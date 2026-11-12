import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import ClassifiedPlaceholder from "@/components/ClassifiedPlaceholder";
import { Directory, DirectoryLink } from "@/components/Directory";
import ProjectTracker from "@/components/ProjectTracker";
import ContentWriting from "@/components/ContentWriting";
import DesktopFile, { DesktopFolder } from "@/components/DesktopFile";
import ContentGallery from "@/components/ContentGallery";
import FactionGrid from "@/components/FactionGrid";
import { getProject, getProjectIdentity, getFactions, getArchiveItems, getLoreIndex } from "@/lib/content/queries";
import { createLoreLinker } from "@/lib/content/lore";
import { LoreLayout, LoreReferences, LoreText } from "@/components/LoreText";
import { projectHref, chapterHref } from "@/lib/content/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  return { title: project?.title ?? await lockedPageTitle({ projectSlug: (await params).slug }) };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: (await params).slug });
  const identity = await getProjectIdentity(project.slug);
  const factions = identity ? await getFactions(identity.id) : [];
  const archiveItems = (await getArchiveItems()).filter(item => item.projectSlug === project.slug);
  // Lore links (board 8) in the description and the writing; the aside sits beside the description.
  const lore = createLoreLinker(identity ? await getLoreIndex(identity.id) : []);
  const description = lore.text(project.description);
  const writing = lore.writing(project.writing);
  const references = lore.used();
  return (
    <Directory
      path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/`}
      title={project.title}
    >
      <p className="eyebrow">
        {project.id} / {project.status} / UPDATED{" "}
        <time dateTime={project.updated}>{project.updated}</time>
      </p>
      <LoreLayout aside={references.length ? <LoreReferences entries={references} /> : null}>
        <p className="lede"><LoreText segments={description} /></p>
      </LoreLayout>
      <section id="factions" className="section-block">
        <h2>FACTIONS</h2>
        <FactionGrid project={project} factions={factions} />
      </section>
      {project.hero && <ContentGallery images={[project.hero]} />}
      <div id="writing"><ContentWriting data={writing} /></div>
      {archiveItems.length > 0 && <div className="directory-list">
        {archiveItems.map(item => <DirectoryLink key={item.slug} classification={item.classification} safeLabel={item.safeLabel} href={`/archive#item-${item.slug}`} name={item.title} meta="ARCHIVE RECORD" />)}
      </div>}
      {project.galleries.map((gallery) => gallery.classification ? <ClassifiedPlaceholder key={gallery.slug} classification={gallery.classification} label={gallery.safeLabel} variant="media" /> : (
        <section className="section-block" id={`gallery-${gallery.slug}`} key={gallery.slug}>
          <h2>{gallery.title}</h2><p>{gallery.description}</p>
          <DesktopFile label={gallery.title + ".ART"} type="ART" href={projectHref(project) + "#gallery-" + gallery.slug}
            viewerTab={{ id: "gallery:" + project.slug + ":" + gallery.slug, href: projectHref(project) + "#gallery-" + gallery.slug, title: gallery.title, project: project.title, description: gallery.description, images: gallery.images.filter(image => !image.classification && !/\.pdf(?:\?|$)/i.test(image.src)) }}
            metadata={[{ label: "NAME", value: gallery.title }, { label: "PROJECT", value: project.title }, { label: "TYPE", value: "GALLERY" }, { label: "IMAGE COUNT", value: String(gallery.images.filter(image => !image.classification && !/\.pdf(?:\?|$)/i.test(image.src)).length) }]} />
          <ContentGallery images={gallery.images} />
        </section>
      ))}
      <div className="directory-list">
        {project.chapters.map((chapter) => (
          <DirectoryLink
            key={chapter.slug}
            classification={chapter.classification} safeLabel={chapter.safeLabel}
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
        {project.galleries.length > 0 && <DesktopFolder
          label="ARTWORK/" href={"#gallery-" + project.galleries[0].slug}
          subtitle={project.galleries.length + " GALLERIES"}
          metadata={[{ label: "PROJECT", value: project.title }, { label: "TYPE", value: "ARTWORK" }]} />}
        {(project.galleries.length ? ["ENVIRONMENTS", "DEVELOPMENT"] : ["ARTWORK", "ENVIRONMENTS", "DEVELOPMENT"]).map((folder) => (
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
          {project.notes.map((note, index) => note.classification ? <ClassifiedPlaceholder key={index} classification={note.classification} label={note.safeLabel} variant="inline" /> : (
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
