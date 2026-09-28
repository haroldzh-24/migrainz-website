"use client";

import { useWindowManager, type ViewerTab } from "@/components/WindowManager";
import type { AccessControl, Character, Project } from "@/lib/content/types";
import DesktopFile from "@/components/DesktopFile";

type ViewerCharacter = Pick<Character, "slug" | "name" | "role" | "description" | "images" | "updated"> & { access?: AccessControl };

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
  const tab = tabFor(project, character);
  const locked = character.access?.state === "redacted" || character.access?.state === "patron";
  const shownName = locked ? character.access?.displayTitle || character.name : character.name;
  return <DesktopFile
    label={`${shownName.replace(/\s+/g, "_")}.CHR`}
    type="CHR"
    href={tab.href}
    subtitle={locked ? character.access?.teaser || (character.access?.state === "patron" ? "CLASSIFIED / PATRON" : character.access?.redactionLabel || "REDACTED") : character.role}
    viewerTab={locked ? undefined : tab}
    metadata={[
      { label: "NAME", value: shownName },
      { label: "PROJECT", value: project.title },
      ...(locked ? [{ label: "ACCESS", value: character.access?.state === "patron" ? "CLASSIFIED" : "REDACTED" }] : [
        ...(character.role ? [{ label: "ROLE", value: character.role }] : []),
        { label: "IMAGE COUNT", value: String(character.images.length) }, { label: "TYPE", value: "CHARACTER" },
        ...(character.updated ? [{ label: "UPDATED", value: character.updated }] : []),
      ]),
    ]}
  />;
}

export function CharacterViewerButton({ project, character }: { project: Pick<Project, "slug" | "title">; character: ViewerCharacter }) {
  const { openViewerTab } = useWindowManager();
  return <button type="button" className="terminal-button character-viewer-button" onClick={() => openViewerTab(tabFor(project, character))}>OPEN IN ART VIEWER</button>;
}
