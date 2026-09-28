"use client";

import DesktopFile from "@/components/DesktopFile";
import { useWindowManager, type ViewerTab } from "@/components/WindowManager";
import type { AccessControl, ComicPage } from "@/lib/content/types";

type Props = {
  project: { slug: string; title: string };
  equipment: { slug: string; name: string; category: string; description: string; images: ComicPage[]; updated: string; access?: AccessControl };
};
function tabFor({ project, equipment }: Props): ViewerTab {
  return { id: `equipment:${project.slug}:${equipment.slug}`, href: `/projects/${project.slug}/equipment/${equipment.slug}`,
    title: equipment.name, project: project.title, role: equipment.category, description: equipment.description,
    images: equipment.images.filter(image => !/\.pdf(?:\?|$)/i.test(image.src)) };
}
export function EquipmentViewerLink(props: Props) {
  const tab = tabFor(props);
  const access = props.equipment.access;
  const locked = access?.state === "redacted" || access?.state === "patron";
  const title = locked ? access?.displayTitle || tab.title : tab.title;
  return <DesktopFile label={`${title.replace(/\s+/g, "_")}.EQP`} type="EQP" href={tab.href}
    subtitle={locked ? access?.teaser || (access?.state === "patron" ? "CLASSIFIED / PATRON" : access?.redactionLabel || "REDACTED") : props.equipment.category}
    viewerTab={locked ? undefined : tab}
    metadata={locked ? [{ label: "NAME", value: title }, { label: "PROJECT", value: tab.project }, { label: "ACCESS", value: access?.state === "patron" ? "CLASSIFIED" : "REDACTED" }] :
      [{ label: "NAME", value: title }, { label: "PROJECT", value: tab.project }, { label: "CATEGORY", value: props.equipment.category },
        { label: "TYPE", value: "EQUIPMENT" }, { label: "IMAGE COUNT", value: String(tab.images.length) }, { label: "UPDATED", value: props.equipment.updated }]} />;
}
export function EquipmentViewerButton(props: Props) {
  const { openViewerTab } = useWindowManager();
  return <button type="button" className="terminal-button character-viewer-button" onClick={() => openViewerTab(tabFor(props))}>OPEN IN ART VIEWER</button>;
}
