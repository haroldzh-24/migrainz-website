"use client";

import Link from "next/link";
import DirectoryThumbnail from "./DirectoryThumbnail";
import type { ComicPage } from "@/lib/content/types";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWindowManager, type ViewerTab } from "@/components/WindowManager";
import ClassifiedPlaceholder from '@/components/ClassifiedPlaceholder';
import type { Classified } from '@/lib/content/types';

type Props = Classified & {
  label: string;
  /** File-style name shown small under the readable label, e.g. THE_OBSERVER.CHR. */
  fileName?: string;
  type: string;
  href: string;
  subtitle?: string;
  thumbnail?: ComicPage;
  imagePreview?: boolean;
  /** The thumbnail is a schematic poster, not artwork: it gets the terminal recolour. */
  schematicThumbnail?: boolean;
  viewerTab?: ViewerTab;
  /** Keep the viewer tab's thumbnail but navigate to href instead of opening the Art Viewer. */
  opensPage?: boolean;
  metadata?: { label: string; value: string }[];
};

export default function DesktopFile(props: Props) {
  if (props.classification) return <ClassifiedPlaceholder classification={props.classification} label={props.safeLabel} />;
  return <PublicDesktopFile {...props} />;
}

function PublicDesktopFile({ label, fileName, type, href, subtitle, viewerTab, opensPage, thumbnail, imagePreview, schematicThumbnail, metadata = [] }: Props) {
  const { openViewerTab } = useWindowManager();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  const cancel = () => { if (timer.current) clearTimeout(timer.current); };
  const reveal = () => { cancel(); timer.current = setTimeout(() => setOpen(true), 250); };
  const dismiss = () => { cancel(); setOpen(false); setPinned(false); };
  useEffect(() => () => cancel(), []);
  useEffect(() => {
    if (!open) return;
    // Handled here only: the Art Viewer must not also close on this key.
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); dismiss(); } };
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) dismiss(); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", outside); };
  }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = root.current?.getBoundingClientRect();
      const box = panel.current?.getBoundingClientRect();
      if (!anchor || !box) return;
      const top = anchor.bottom + box.height + 6 <= window.innerHeight - 8
        ? anchor.bottom + 6
        : anchor.top - box.height - 6;
      setPosition({
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - box.height - 8)),
      });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { observer.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]);
  return <div ref={root} className={`desktop-file${viewerTab ? " artwork-file" : ""}${imagePreview ? " faction-file" : ""}`}
    onPointerEnter={event => { if (event.pointerType === "mouse") reveal(); }}
    onPointerLeave={() => { cancel(); if (!pinned && !root.current?.contains(document.activeElement)) setOpen(false); }}
    // Keyboard focus only: focus that a click (or the Art Viewer handing focus back after a click) puts here must not
    // pop the Properties panel.
    onFocus={event => { if ((event.target as Element).matches(":focus-visible")) reveal(); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && (!pinned || event.relatedTarget)) dismiss(); }}>
    <Link className="desktop-file-open" href={href} prefetch={false} aria-describedby={open ? id : undefined}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        dismiss();
        if (viewerTab && !opensPage) { event.preventDefault(); openViewerTab(viewerTab); }
      }}>
      {(viewerTab || imagePreview) ? <DirectoryThumbnail schematic={schematicThumbnail} eager={imagePreview} image={thumbnail ?? viewerTab?.images.find(image => image.src && !/\.pdf(?:\?|$)/i.test(image.src))} label={label} /> : <span className="desktop-file-icon" aria-hidden="true">{type}</span>}
      <span className="desktop-file-copy"><strong>{label}</strong>{fileName && <small className="desktop-file-name">{fileName}</small>}{subtitle && <small>{subtitle}</small>}</span>
    </Link>
    <button className="desktop-file-info" type="button" aria-label={`Properties for ${fileName ?? label}`} aria-expanded={open} aria-describedby={open ? id : undefined} aria-controls={open ? id : undefined}
      onClick={() => { cancel(); setOpen(!pinned); setPinned(!pinned); }}>i</button>
    {open && createPortal(<div ref={panel} id={id} role="tooltip" className={`desktop-inspector${pinned ? " is-pinned" : ""}`} style={position}>
      <strong>{fileName ?? label}</strong>
      {metadata.filter(field => field.value !== "").map(field => <div key={field.label}><span>{field.label}</span><b>{field.value}</b></div>)}
    </div>, document.body)}
  </div>;
}

export function DesktopFolder(props: Omit<Props, "type" | "viewerTab">) {
  return <DesktopFile {...props} type="DIR" />;
}
