import Link from "next/link";
import type { ReactNode } from "react";
import ClassifiedPlaceholder from '@/components/ClassifiedPlaceholder';
import DecodeText from "@/components/DecodeText";
import TypeOut from "@/components/TypeOut";
import type { Classified } from '@/lib/content/types';

export function Directory({
  path,
  title,
  compact = false,
  heading = true,
  pathLine = true,
  children,
}: {
  path: string;
  title: string;
  compact?: boolean;
  /** false: the page's own heading carries the title (the dossier template, components/Dossier.tsx). */
  heading?: boolean;
  /** false: the page draws its own path line (the scroll-told project page's header strip, components/ScrollFile.tsx). */
  pathLine?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={compact ? "directory-page directory-compact" : "directory-page"}>
      <nav className="breadcrumbs" aria-label="Directory navigation">
        <Link href="/">HOME</Link>
        <Link href="/projects">PROJECTS</Link>
        <Link href="/tracker">TRACKER</Link>
        <Link href="/comics">COMICS</Link>
      </nav>
      {pathLine && <p className="eyebrow directory-path">{path}</p>}
      {heading && <h1><DecodeText text={title} /></h1>}
      {children}
      <TypeOut />
    </section>
  );
}

export function DirectoryLink({
  href,
  name,
  meta,
  classification,
  safeLabel,
}: {
  href: string;
  name: string;
  meta: string;
} & Classified) {
  if (classification) return <ClassifiedPlaceholder classification={classification} label={safeLabel} />;
  return (
    <Link className="directory-row" href={href}>
      <span aria-hidden="true">↳</span>
      <strong>{name}</strong>
      <span>{meta}</span>
    </Link>
  );
}
