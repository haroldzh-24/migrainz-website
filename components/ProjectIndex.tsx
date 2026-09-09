import Link from "next/link";
import { projects, projectHref } from "@/data/projects";

export default function ProjectIndex() {
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <Link
          className="record-card"
          href={projectHref(project)}
          key={project.slug}
        >
          <div className={`record-image ${project.art}`}>
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
