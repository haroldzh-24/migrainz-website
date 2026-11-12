"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { LoreEntry } from "@/lib/content/lore";

// A record name in lore text (design canvas board 8; batch 24): a link with a preview card under it. The card shows on
// hover and keyboard focus (CSS, so it also works before hydration), on touch the first tap shows it and the second tap
// (or OPEN RECORD) opens the record, and Escape hides it until the pointer or focus leaves. It sits below the link
// (never over it), is shifted left to stay inside the window, and is described to screen readers through
// aria-describedby. Built from spans only: it lives inside <p>. Fades in over --motion-lock unless motion is reduced.

const KIND_FILE: Record<LoreEntry["kind"], string> = { character: "character.rec", faction: "faction.dir", equipment: "" };

export function LorePreviewCard({ entry, id }: { entry: LoreEntry; id: string }) {
  const meta = entry.kind === "character" ? `${KIND_FILE.character}${entry.faction ? ` · ${entry.faction}` : ""}`
    : entry.kind === "faction" ? `${KIND_FILE.faction} · ${entry.members ?? 0} ${entry.members === 1 ? "member" : "members"}`
    : entry.file;
  return <span className="lore-preview" role="tooltip" id={id} data-kind={entry.kind}>
    <span className="lore-preview-head">
      {entry.kind === "character" && <span className="lore-preview-portrait" aria-hidden="true">
        {entry.portrait && <img src={entry.portrait} alt="" loading="lazy" decoding="async" width={56} height={56} />}
      </span>}
      <span className="lore-preview-title"><b>{entry.name}</b><span className="lore-preview-meta">{meta}</span></span>
    </span>
    {entry.kind === "equipment" && entry.poster && <span className="lore-preview-poster" aria-hidden="true">
      <img src={entry.poster} alt="" loading="lazy" decoding="async" data-schematic />
    </span>}
    {entry.summary && <span className="lore-preview-summary">{entry.summary}</span>}
    <Link className="lore-preview-open" href={entry.href} tabIndex={-1} aria-hidden="true" prefetch={false}>OPEN RECORD ▸</Link>
  </span>;
}

export default function LoreLink({ entry, children }: { entry: LoreEntry; children?: ReactNode }) {
  const id = useId();
  const term = useRef<HTMLSpanElement>(null);
  const touch = useRef(false);
  // `open`: shown by a tap (hover and focus show it through CSS). `dismissed`: hidden by Escape until pointer/focus leave.
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  // Keep the 280 px card inside the scrolling window (or the page): shift it left when the link sits near the right edge,
  // and (24b) open it above the link, never over it, when there is no room below inside the window: a card below the
  // last visible line was clipped and grew the window's scroll height.
  const place = () => {
    const element = term.current;
    if (!element) return;
    // An absolutely placed child of a wrapped inline starts at the inline's FIRST line box, not its bounding box.
    const lines = element.getClientRects();
    const box = lines[0] ?? element.getBoundingClientRect();
    const last = lines[lines.length - 1] ?? box;
    const container = element.closest(".project-app-content, main");
    const frame = container?.getBoundingClientRect();
    const left = Math.max(frame?.left ?? 0, 0) + 8, right = Math.min(frame?.right ?? innerWidth, document.documentElement.clientWidth) - 8;
    const width = Math.min(280, right - left);
    const shift = Math.min(0, right - (box.left + width));
    element.style.setProperty("--lore-shift", `${Math.round(Math.max(shift, left - box.left))}px`);
    element.style.setProperty("--lore-width", `${Math.round(width)}px`);
    // The card's height at this width: measured while it is laid out but not drawn (it may still be display: none).
    const card = element.querySelector<HTMLElement>(":scope > .lore-preview");
    if (!card) return;
    const shown = getComputedStyle(card).display !== "none";
    if (!shown) { card.style.visibility = "hidden"; card.style.display = "block"; }
    const height = card.offsetHeight;
    if (!shown) { card.style.removeProperty("display"); card.style.removeProperty("visibility"); }
    // Inside a window the scrolling content area is the limit; on a terminal page the screen is.
    const inWindow = container?.classList.contains("project-app-content");
    const top = Math.max(inWindow && frame ? frame.top : 0, 0), bottom = Math.min(inWindow && frame ? frame.bottom : innerHeight, innerHeight);
    const below = bottom - last.bottom - 8, above = box.top - top - 8;
    if (height > below && (height <= above || above > below)) element.dataset.flip = "up";
    else delete element.dataset.flip;
  };
  const leave = () => { setOpen(false); setDismissed(false); };
  const hide = () => { setOpen(false); setDismissed(true); };

  // Escape also hides a card the mouse is showing while focus is elsewhere (marked handled, like the site's other Escapes).
  // 24b: in the capture phase on the document, so it runs before every window-level or bubbling Escape handler whatever
  // order they were added in; it stops the key only when this card is actually on screen.
  useEffect(() => {
    if (!hovered || dismissed) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || term.current?.contains(document.activeElement)) return;
      const card = term.current?.querySelector<HTMLElement>(":scope > .lore-preview");
      if (!card || getComputedStyle(card).display === "none") return;
      event.preventDefault();
      event.stopPropagation();
      hide();
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [hovered, dismissed]);

  // 24b: while the card is up, a resize (window, phone rotation) places it again.
  useEffect(() => {
    if (!(hovered || open || focused)) return;
    const again = () => place();
    window.addEventListener("resize", again);
    return () => window.removeEventListener("resize", again);
  }, [hovered, open, focused]);

  // A tap elsewhere closes a card opened by a tap.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => { if (!term.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return <span ref={term} className="lore-term" data-open={open || undefined} data-dismissed={dismissed || undefined}
    onPointerEnter={event => { if (event.pointerType === "mouse") { setHovered(true); place(); } }}
    onPointerLeave={event => { if (event.pointerType === "mouse") { setHovered(false); if (!term.current?.contains(document.activeElement)) leave(); } }}
    onFocus={() => { setFocused(true); place(); }}
    onBlur={event => { if (!term.current?.contains(event.relatedTarget as Node | null)) { setFocused(false); setOpen(false); if (!hovered) setDismissed(false); } }}
    onKeyDown={event => {
      if (event.key !== "Escape") { touch.current = false; return; }
      if (dismissed || event.defaultPrevented) return;
      // The card was showing (focus or a tap): Escape hides it and goes no further (a window would close otherwise).
      event.preventDefault();
      event.stopPropagation();
      hide();
    }}>
    <Link className="lore-link" href={entry.href} aria-describedby={id} prefetch={false} data-lore-kind={entry.kind}
      onPointerDown={event => { touch.current = event.pointerType !== "mouse"; }}
      onClick={event => {
        // Touch: the first tap shows the card, the second opens the record.
        if (touch.current && !open && event.detail !== 0) { event.preventDefault(); place(); setDismissed(false); setOpen(true); }
      }}>{children ?? entry.name}</Link>
    <LorePreviewCard entry={entry} id={id} />
  </span>;
}
