"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
import { RetroWindow, useWindowManager } from './WindowManager';

export default function RouteApplication({ id, title, navigation = [], children }: {
  id: string; title: string; navigation?: { label: string; href: string }[]; children: ReactNode;
}) {
  const manager = useWindowManager();
  const latest = useRef(manager);
  latest.current = manager;
  const pathname = usePathname();
  useEffect(() => {
    latest.current.restoreWindow(id);
  }, [id, pathname]);
  useEffect(() => {
    const restore = () => latest.current.restoreWindow(id);
    window.addEventListener('migrainz:restore-route', restore);
    return () => window.removeEventListener('migrainz:restore-route', restore);
  }, [id]);
  useEffect(() => () => latest.current.unregisterWindow(id), [id]);
  return <>
    <div className="application-desktop"><p>STUDIO MIGRAINZ / APPLICATION WORKSPACE</p>
      <button className="terminal-button" onClick={() => manager.restoreWindow(id)}>OPEN {title}</button>
      <Link href="/">RETURN TO TERMINAL</Link>
    </div>
    <RetroWindow id={id} title={title} defaultMaximized defaultPosition={{ x: 24, y: 24 }} defaultSize={{ width: 1000, height: 720 }}
      className="project-application" onToggleMaximize={() => manager.toggleMaximizeWindow(id)}>
      {navigation.length > 0 && <nav className="project-app-nav" aria-label="Project sections">{navigation.map(item =>
        <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav>}
      <div className="project-app-content" key={pathname}>{children}</div>
    </RetroWindow>
  </>;
}
