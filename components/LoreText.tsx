import Link from "next/link";
import { Fragment } from "react";
import LoreLink from "@/components/LoreLink";
import type { LoreEntry, LoreSegment } from "@/lib/content/lore";

// Lore links (design canvas board 8; batch 24): plain text (a textarea field) with record names as preview links. The
// segments come from createLoreLinker().text() on the server, so only public records are ever linked.
export function LoreText({ segments }: { segments: LoreSegment[] }) {
  return <>{segments.map((segment, index) => typeof segment === "string"
    ? <Fragment key={index}>{segment}</Fragment>
    : <LoreLink key={index} entry={segment.entry}>{segment.text}</LoreLink>)}</>;
}

const KIND_LABEL: Record<LoreEntry["kind"], string> = { character: "character", faction: "faction", equipment: "equipment" };

/**
 * The CROSS-REFERENCES aside (board 8): every record linked in this page's lore, in first-link order, then the chapters
 * the record appears in. Nothing to list: nothing rendered.
 */
export function LoreReferences({ entries, appearsIn = [] }: { entries: LoreEntry[]; appearsIn?: { label: string; href: string }[] }) {
  if (!entries.length && !appearsIn.length) return null;
  return <aside className="lore-references" aria-labelledby="lore-references-title">
    <h2 id="lore-references-title">CROSS-REFERENCES</h2>
    <ul>
      {entries.map(entry => <li key={entry.key}><Link href={entry.href} prefetch={false}>{entry.name}</Link> <span className="lore-references-kind">{KIND_LABEL[entry.kind]}</span></li>)}
      {appearsIn.map(item => <li key={item.href}><Link href={item.href} prefetch={false}>{item.label}</Link> <span className="lore-references-kind">appears in</span></li>)}
    </ul>
  </aside>;
}

/** Lore text beside its CROSS-REFERENCES aside: side by side when the window is wide enough, the aside below otherwise. */
export function LoreLayout({ children, aside }: { children: React.ReactNode; aside: React.ReactNode }) {
  if (!aside) return <>{children}</>;
  return <div className="lore-layout"><div className="lore-main">{children}</div>{aside}</div>;
}
