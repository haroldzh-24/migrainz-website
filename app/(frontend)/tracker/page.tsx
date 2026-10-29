import { Directory } from "@/components/Directory";
import ProjectTracker from "@/components/ProjectTracker";
import OperationsLog, { type OperationsEntry } from "@/components/OperationsLog";
import { getProjects } from "@/lib/content/queries";
import { projectHref } from "@/lib/content/types";
export const metadata = { title: "Project tracker" };
export default async function TrackerPage() {
  const projects = await getProjects();
  // Operations log (design canvas board 12): every public update of every public project, newest first (the query's
  // order), one line each. Classified updates stay in their project card's log only.
  const updates = projects.filter(project => !project.classification)
    .flatMap(project => project.notes.flatMap(note => note.classification || note.id === undefined ? [] : [{ project, note }]))
    .sort((a, b) => (a.note.listingOrder ?? 0) - (b.note.listingOrder ?? 0));
  const entries: OperationsEntry[] = updates.slice(0, 12).map(({ project, note }) => {
    const picture = note.images?.find(image => !image.classification && image.src);
    return { id: note.id!, code: project.id, href: projectHref(project), title: note.title || note.text.split("\n")[0], date: note.date,
      thumb: picture ? { src: picture.thumbnailSrc ?? picture.src, alt: picture.alt } : undefined };
  });
  return (
    <Directory path="SYS:/OPERATIONS/" title="PROJECT TRACKER">
      <p className="lede">
        Public phases, milestones and production notes.
      </p>
      <OperationsLog entries={entries} allIDs={updates.map(({ note }) => note.id!)} />
      {/* Keeps the heading order h1 > h2 > h3 for screen readers; each project card has its own h3. */}
      <h2 className="visually-hidden">Projects</h2>
      {projects
        .filter((project) => project.classification || project.phases.length > 0)
        .map((project) => (
          <ProjectTracker key={project.slug} project={project} />
        ))}
    </Directory>
  );
}
