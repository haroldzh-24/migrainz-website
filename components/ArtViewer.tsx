"use client";

import { useEffect, useState } from "react";
import { RetroWindow, useWindowManager } from "@/components/WindowManager";

export default function ArtViewer() {
  const { viewerTabs, activeViewerTab, switchViewerTab, closeViewerTab } = useWindowManager();
  const [imageIndex, setImageIndex] = useState(0);
  const active = viewerTabs.find((tab) => tab.id === activeViewerTab) ?? viewerTabs[0];

  useEffect(() => setImageIndex(0), [active?.id]);
  if (!active) return null;
  const image = active.images[imageIndex] ?? active.images[0];

  return <RetroWindow
    id="art-viewer"
    title="ART VIEWER"
    className="art-viewer-window"
    defaultPosition={{ x: 70, y: 50 }}
    defaultSize={{ width: 900, height: 650 }}
  >
    <div className="art-viewer-tabs" role="tablist" aria-label="Open artwork">
      {viewerTabs.map((tab) => <div className={`art-viewer-tab${tab.id === active.id ? " is-active" : ""}`} key={tab.id}>
        <button type="button" role="tab" aria-selected={tab.id === active.id} onClick={() => switchViewerTab(tab.id)}>{tab.title}</button>
        <button type="button" className="art-viewer-tab-close" aria-label={`Close ${tab.title}`} onClick={() => closeViewerTab(tab.id)}>×</button>
      </div>)}
    </div>
    <div className="art-viewer-canvas">
      {image ? <img src={image.src} alt={image.alt} width={image.width} height={image.height} /> : <div className="art-viewer-placeholder">NO PUBLIC ARTWORK FILED</div>}
    </div>
    {active.images.length > 1 && <div className="art-viewer-thumbs" aria-label={`${active.title} artwork pages`}>
      {active.images.map((item, index) => <button type="button" key={`${item.src}-${index}`} className={index === imageIndex ? "is-active" : ""} aria-label={`Show image ${index + 1}`} onClick={() => setImageIndex(index)}>
        <img src={item.src} alt="" loading="lazy" />
      </button>)}
    </div>}
    <div className="art-viewer-meta">
      <div><strong>{active.title}</strong><span>{active.project}{active.role ? ` / ${active.role}` : ""}</span></div>
      {active.description && <p>{active.description}</p>}
      {image?.caption && <small>{image.caption}</small>}
    </div>
  </RetroWindow>;
}
