"use client";

import Link from "next/link";
import { useWindowManager, type ViewerTab } from "@/components/WindowManager";
import type { Character, Project } from "@/lib/content/types";

type ViewerCharacter = Pick<Character, "slug" | "name" | "role" | "description" | "images">;

function tabFor(project: Pick<Project, "slug" | "title">, character: ViewerCharacter): ViewerTab {
  return {
    id: `${project.slug}:${character.slug}`,
    href: `/projects/${project.slug}/characters/${character.slug}`,
    title: character.name,
    project: project.title,
    role: character.role,
    description: character.description,
    images: character.images,
  };
}

export function CharacterViewerLink({ project, character }: { project: Pick<Project, "slug" | "title">; character: ViewerCharacter }) {
  const { openViewerTab } = useWindowManager();
  const tab = tabFor(project, character);
  return <Link href={tab.href} className="directory-row" onClick={(event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openViewerTab(tab);
  }}>
    <span aria-hidden="true">↳</span><strong>{character.name}</strong><span>{character.role}</span>
  </Link>;
}

export function CharacterViewerButton({ project, character }: { project: Pick<Project, "slug" | "title">; character: ViewerCharacter }) {
  const { openViewerTab } = useWindowManager();
  return <button type="button" className="terminal-button character-viewer-button" onClick={() => openViewerTab(tabFor(project, character))}>OPEN IN ART VIEWER</button>;
}
