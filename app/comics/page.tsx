import { Directory, DirectoryLink } from "@/components/Directory";
import { projects, chapterHref } from "@/data/projects";
export const metadata = { title: "Comics" };
export default function ComicsPage() {
  return (
    <Directory path="SYS:/COMICS/" title="COMIC DIRECTORY">
      <p className="lede">
        Select a chapter. The current release contains public sample pages.
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
