import Link from "next/link";
import type { ReactNode } from "react";

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
}: {
  href: string;
  name: string;
  meta: string;
}) {
  return (
    <Link className="directory-row" href={href}>
      <span aria-hidden="true">↳</span>
      <strong>{name}</strong>
      <span>{meta}</span>
    </Link>
  );
}
