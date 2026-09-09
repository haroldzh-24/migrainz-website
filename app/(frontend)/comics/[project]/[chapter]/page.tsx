import { notFound } from "next/navigation";
import { Directory } from "@/components/Directory";
import ComicReader from "@/components/ComicReader";
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
  if (!project) notFound();
  const chapter = project.chapters.find((c) => c.slug === ids.chapter);
  if (!chapter) notFound();
  return (
    <Directory
      path={`SYS:/COMICS/${project.slug.toUpperCase()}/${chapter.slug.toUpperCase()}/`}
      title={chapter.title}
    >
      <p className="lede">{chapter.description}</p>
      <ComicReader project={{ slug: project.slug, title: project.title }} chapter={chapter} />
    </Directory>
  );
}
