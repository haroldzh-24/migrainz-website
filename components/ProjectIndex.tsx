import Link from "next/link";
import { projectHref } from "@/lib/content/types";
import { getProjects } from "@/lib/content/queries";

export default async function ProjectIndex() {
  const projects = await getProjects();
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <Link
          className="record-card"
          href={projectHref(project)}
          key={project.slug}
        >
          <div className={`record-image ${project.art}`}>
            {project.hero && <img className="cms-hero-image" src={project.hero.src} alt={project.hero.alt} />}
            <span>{project.id}</span>
          </div>
          <div className="record-copy">
            <p>
              {project.category} / {project.status}
            </p>
            <h3>{project.title}</h3>
            <span>{project.summary}</span>
            <p>OPEN DIRECTORY →</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
