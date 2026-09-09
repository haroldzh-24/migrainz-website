import { Directory, DirectoryLink } from "@/components/Directory";
import { getProjects } from "@/lib/content/queries";
import { chapterHref } from "@/lib/content/types";
export const metadata = { title: "Comics" };
export default async function ComicsPage() {
  const projects = await getProjects();
  return (
    <Directory path="SYS:/COMICS/" title="COMIC DIRECTORY">
      <p className="lede">
        Select a chapter to open the reader.
      </p>
      <div className="directory-list">
        {projects.flatMap((project) =>
          project.chapters.map((chapter) => (
            <DirectoryLink
              key={`${project.slug}-${chapter.slug}`}
              href={chapterHref(project, chapter)}
              name={`${project.title} / ${chapter.title}`}
              meta={`${chapter.pages.length} PAGES`}
            />
          )),
        )}
      </div>
    </Directory>
  );
}
