import { Directory } from "@/components/Directory";
import ProjectTracker from "@/components/ProjectTracker";
import { getProjects } from "@/lib/content/queries";
export const metadata = { title: "Project tracker" };
export default async function TrackerPage() {
  const projects = await getProjects();
  return (
    <Directory path="SYS:/OPERATIONS/" title="PROJECT TRACKER">
      <p className="lede">
        Public phases, milestones and production notes. Current values are
        demonstration data carried over from the prototype.
      </p>
      {projects
        .filter((project) => project.phases.length > 0)
        .map((project) => (
          <ProjectTracker key={project.slug} project={project} />
        ))}
    </Directory>
  );
}
