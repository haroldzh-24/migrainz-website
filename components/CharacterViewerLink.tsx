"use client";

import { useWindowManager, type ViewerTab } from "@/components/WindowManager";
import type { Character, Project } from "@/lib/content/types";
import DesktopFile from "@/components/DesktopFile";
import ClassifiedPlaceholder from '@/components/ClassifiedPlaceholder';

type ViewerCharacter = Pick<Character, "slug" | "name" | "role" | "description" | "images" | "updated" | "classification" | "safeLabel">;

function tabFor(project: Pick<Project, "slug" | "title">, character: ViewerCharacter): ViewerTab {
  return {
    id: `${project.slug}:${character.slug}`,
    href: `/projects/${project.slug}/characters/${character.slug}`,
    title: character.name,
    project: project.title,
    role: character.role,
    description: character.description,
    images: character.images.filter(image => !image.classification && !/\.pdf(?:\?|$)/i.test(image.src)),
  };
}

export function CharacterViewerLink({ project, character }: { project: Pick<Project, "slug" | "title">; character: ViewerCharacter }) {
  if (character.classification) return <ClassifiedPlaceholder classification={character.classification} label={character.safeLabel} />;
  const tab = tabFor(project, character);
  return <DesktopFile
    label={`${character.name.replace(/\s+/g, "_")}.CHR`}
    type="CHR"
    subtitle={character.role}
    href={tab.href}
    viewerTab={tab}
    metadata={[
      { label: "NAME", value: character.name },
      { label: "PROJECT", value: project.title },
      ...(character.role ? [{ label: "ROLE", value: character.role }] : []),
      { label: "IMAGE COUNT", value: String(character.images.length) },
      { label: "TYPE", value: "CHARACTER" },
      ...(character.updated ? [{ label: "UPDATED", value: character.updated }] : []),
    ]}
  />;
}

export function CharacterViewerButton({ project, character }: { project: Pick<Project, "slug" | "title">; character: ViewerCharacter }) {
  const { openViewerTab } = useWindowManager();
  if (character.classification) return <ClassifiedPlaceholder classification={character.classification} label={character.safeLabel} />;
  return <button type="button" className="terminal-button character-viewer-button" onClick={() => openViewerTab(tabFor(project, character))}>OPEN IN ART VIEWER</button>;
}
