import { projectHref } from "@/lib/content/types";
import { getProjects } from "@/lib/content/queries";
import { DesktopFolder } from "@/components/DesktopFile";

export default async function ProjectIndex() {
  const projects = await getProjects();
  return (
    <div className="desktop-file-grid project-grid">
      {projects.map((project) => (
        <DesktopFolder
          key={project.slug}
          label={`${project.title}/`}
          href={projectHref(project)}
          metadata={[
            ...(project.category ? [{ label: "CATEGORY", value: project.category }] : []),
            ...(project.status ? [{ label: "STATUS", value: project.status }] : []),
            ...(project.updated ? [{ label: "LAST UPDATE", value: project.updated }] : []),
            { label: "CHAPTER COUNT", value: String(project.chapters.length) },
            { label: "PAGE COUNT", value: String(project.chapters.reduce((count, chapter) => count + chapter.pages.length, 0)) },
          ]}
        />
      ))}
    </div>
  );
}
