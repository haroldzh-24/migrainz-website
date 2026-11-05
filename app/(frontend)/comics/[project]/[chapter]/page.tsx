import { lockedPageOrNotFound } from "@/components/LockedContentPage";
import { Directory } from "@/components/Directory";
import ComicReader from "@/components/ComicReader";
import { GraphicsRouteMarker } from "@/components/GraphicsRouteMarker";
import { getProject } from "@/lib/content/queries";
import { projectHref, chapterHref } from "@/lib/content/types";
export const metadata = { title: "Comic reader" };
export default async function ReaderPage({
  params,
}: {
  params: Promise<{ project: string; chapter: string }>;
}) {
  const ids = await params;
  const project = await getProject(ids.project);
  if (!project) return lockedPageOrNotFound({ projectSlug: ids.project, kind: "chapters", slug: ids.chapter });
  const chapter = project.chapters.find((c) => c.slug === ids.chapter && !c.classification);
  if (!chapter) return lockedPageOrNotFound({ projectSlug: ids.project, kind: "chapters", slug: ids.chapter });
  // Batch 20: the next readable chapter of the same comic, for the ghost's end-of-chapter line (project.chapters mixes
  // every comic of the project and puts classified placeholders first).
  const after = project.chapters.slice(project.chapters.indexOf(chapter) + 1);
  const next = after.find(c => !c.classification && c.pages.length > 0 && c.comicTitle === chapter.comicTitle && c.chapterNumber !== undefined);
  return (
    <Directory
      path={`SYS:/COMICS/${project.slug.toUpperCase()}/${chapter.slug.toUpperCase()}/`}
      title={chapter.title}
    >
      <GraphicsRouteMarker />
      <p className="lede">{chapter.description}</p>
      <ComicReader key={`${project.slug}/${chapter.slug}`} project={{ slug: project.slug, title: project.title }} chapter={chapter}
        next={next ? { href: chapterHref(project, next), number: next.chapterNumber! } : null} />
    </Directory>
  );
}
