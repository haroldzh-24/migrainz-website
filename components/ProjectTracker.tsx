"use client";

import ClassifiedPlaceholder from "@/components/ClassifiedPlaceholder";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { projectHref, type Project } from "@/lib/content/types";

export default function ProjectTracker({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  if (project.classification) return <ClassifiedPlaceholder classification={project.classification} label={project.safeLabel} />;
  const logId = `${project.slug}-log`;
  return (
    <article className="project-status featured-status">
      <div className="status-title">
        <div>
          <p>PROJECT {project.id}</p>
          <h3>
            <Link href={projectHref(project)}>{project.title}</Link>
          </h3>
        </div>
        <div className="status-chip">{project.status}</div>
      </div>
      <div className="progress-list">
        {project.phases.map((phase, index) => phase.classification ? <ClassifiedPlaceholder key={index} classification={phase.classification} label={phase.safeLabel} variant="inline" /> : (
          <div className="progress-row" key={phase.label}>
            <span>{phase.label}</span>
            <div
              className="bar"
              role="progressbar"
              aria-label={phase.label}
              aria-valuenow={phase.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ "--p": `${phase.percent}%` } as CSSProperties} />
            </div>
            <b>{phase.percent}%</b>
          </div>
        ))}
      </div>
      <div className="status-footer">
        <span>
          LAST UPDATE: <time dateTime={project.updated}>{project.updated}</time>
        </span>
        <button
          className="text-button"
          data-toggle={logId}
          aria-expanded={open}
          aria-controls={logId}
          onClick={() => setOpen(!open)}
        >
          {open ? "HIDE LOG −" : "VIEW LOG +"}
        </button>
      </div>
      <div className={`hidden-log${open ? " open" : ""}`} id={logId}>
        <p>PUBLIC PRODUCTION LOG</p>
        {project.notes.map((note, index) => note.classification ? <ClassifiedPlaceholder key={index} classification={note.classification} label={note.safeLabel} variant="inline" /> : (
          <p key={note.date}>
            <time dateTime={note.date}>{note.date}</time> — {note.text}
          </p>
        ))}
        <h4>MILESTONES</h4>
        {project.milestones.map((item, index) => item.classification ? <ClassifiedPlaceholder key={index} classification={item.classification} label={item.safeLabel} variant="inline" /> : (
          <p key={item.title}>
            {item.title} / {item.status}
          </p>
        ))}
      </div>
    </article>
  );
}
