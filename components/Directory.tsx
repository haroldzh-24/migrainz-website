import Link from "next/link";
import type { ReactNode } from "react";
import ClassifiedPlaceholder from '@/components/ClassifiedPlaceholder';
import type { Classified } from '@/lib/content/types';

export function Directory({
  path,
  title,
  children,
}: {
  path: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="directory-page">
      <nav className="breadcrumbs" aria-label="Directory navigation">
        <Link href="/">HOME</Link>
        <Link href="/projects">PROJECTS</Link>
        <Link href="/tracker">TRACKER</Link>
        <Link href="/comics">COMICS</Link>
      </nav>
      <p className="eyebrow directory-path">{path}</p>
      <h1>{title}</h1>
      {children}
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
