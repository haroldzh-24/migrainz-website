"use client";

import DesktopFile from "@/components/DesktopFile";
import { useWindowManager, type ViewerTab } from "@/components/WindowManager";
import type { ComicPage } from "@/lib/content/types";

type Props = {
  project: { slug: string; title: string };
  equipment: { slug: string; name: string; category: string; description: string; images: ComicPage[]; updated: string };
};
function tabFor({ project, equipment }: Props): ViewerTab {
  return { id: `equipment:${project.slug}:${equipment.slug}`, href: `/projects/${project.slug}/equipment/${equipment.slug}`,
    title: equipment.name, project: project.title, role: equipment.category, description: equipment.description,
    images: equipment.images.filter(image => !/\.pdf(?:\?|$)/i.test(image.src)) };
}
export function EquipmentViewerLink(props: Props) {
  const tab = tabFor(props);
  return <DesktopFile label={`${props.equipment.name.replace(/\s+/g, "_")}.EQP`} type="EQP" href={tab.href} viewerTab={tab}
    metadata={[{ label: "NAME", value: tab.title }, { label: "PROJECT", value: tab.project },
      { label: "CATEGORY", value: props.equipment.category }, { label: "TYPE", value: "EQUIPMENT" },
      { label: "IMAGE COUNT", value: String(tab.images.length) }, { label: "UPDATED", value: props.equipment.updated }]} />;
}
export function EquipmentViewerButton(props: Props) {
  const { openViewerTab } = useWindowManager();
  return <button type="button" className="terminal-button character-viewer-button" onClick={() => openViewerTab(tabFor(props))}>OPEN IN ART VIEWER</button>;
}
