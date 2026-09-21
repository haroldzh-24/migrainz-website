"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useWindowManager, type ViewerTab } from "@/components/WindowManager";

type Props = {
  label: string;
  type: string;
  href: string;
  subtitle?: string;
  viewerTab?: ViewerTab;
  metadata?: { label: string; value: string }[];
};

export default function DesktopFile({ label, type, href, subtitle, viewerTab, metadata = [] }: Props) {
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
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
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
  return <div ref={root} className="desktop-file"
    onPointerEnter={event => { if (event.pointerType === "mouse") reveal(); }}
    onPointerLeave={() => { cancel(); if (!pinned && !root.current?.contains(document.activeElement)) setOpen(false); }}
    onFocus={reveal}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && (!pinned || event.relatedTarget)) dismiss(); }}>
    <Link className="desktop-file-open" href={href} prefetch={false} aria-describedby={open ? id : undefined}
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        dismiss();
        if (viewerTab) { event.preventDefault(); openViewerTab(viewerTab); }
      }}>
      <span className="desktop-file-icon" aria-hidden="true">{type}</span>
      <span className="desktop-file-copy"><strong>{label}</strong>{subtitle && <small>{subtitle}</small>}</span>
    </Link>
    <button className="desktop-file-info" type="button" aria-label={`Properties for ${label}`} aria-expanded={open} aria-describedby={open ? id : undefined} aria-controls={open ? id : undefined}
      onClick={() => { cancel(); setOpen(!pinned); setPinned(!pinned); }}>i</button>
    {open && createPortal(<div ref={panel} id={id} role="tooltip" className={`desktop-inspector${pinned ? " is-pinned" : ""}`} style={position}>
      <strong>{label}</strong>
      {metadata.filter(field => field.value !== "").map(field => <div key={field.label}><span>{field.label}</span><b>{field.value}</b></div>)}
    </div>, document.body)}
  </div>;
}

export function DesktopFolder(props: Omit<Props, "type" | "viewerTab">) {
  return <DesktopFile {...props} type="DIR" />;
}
