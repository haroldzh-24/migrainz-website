"use client";

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { RetroWindow, useWindowManager } from '@/components/WindowManager';
import type { ViewerAccess } from '@/lib/patreon/types';

type PublicAccess = { viewer: ViewerAccess; enabled: boolean; joinURL?: string };
const PatreonContext = createContext<(PublicAccess & { deniedUsed: boolean; showDenied: () => void }) | null>(null);
const deniedID = 'patreon-access-denied';

export function PatreonAccessProvider({ viewer, enabled, joinURL, children }: PublicAccess & { children: ReactNode }) {
  const [deniedUsed, setDeniedUsed] = useState(false);
  const identity = `${viewer.userID ?? 'anonymous'}:${viewer.activePatron}:${viewer.verification}:${viewer.tierIDs.join(',')}`;
  useLayoutEffect(() => {
    // Account changes must not restore previously entitled descriptions from the
    // viewer's optional session cache. OAuth credentials never go here.
    try {
      const previous = sessionStorage.getItem('migrainz-patreon-clearance');
      if ((previous && previous !== identity) || (!previous && viewer.signedIn)) sessionStorage.removeItem('migrainz-art-viewer-tabs-v2');
      sessionStorage.setItem('migrainz-patreon-clearance', identity);
    } catch { /* Optional viewer persistence. */ }
  }, [identity, viewer.signedIn]);
  return <PatreonContext.Provider value={{ viewer, enabled, joinURL, deniedUsed, showDenied: () => setDeniedUsed(true) }}>{children}</PatreonContext.Provider>;
}

export function PatreonActions({ enabled, joinURL, signedIn }: { enabled: boolean; joinURL?: string; signedIn: boolean }) {
  return <div className="patreon-actions">
    {enabled ? <a className="terminal-button" href="/auth/patreon/start">SIGN IN WITH PATREON</a> : <button className="terminal-button" disabled>PATREON SIGN-IN UNAVAILABLE</button>}
    {joinURL ? <a className="terminal-button" href={joinURL} target="_blank" rel="noopener noreferrer">BECOME A PATRON</a> : <button className="terminal-button" disabled>BECOME A PATRON — LINK UNAVAILABLE</button>}
    {signedIn && <form method="post" action="/auth/patreon/signout"><button className="terminal-button" type="submit">SIGN OUT</button></form>}
  </div>;
}

export function PatronLocked({ children, className }: { children: ReactNode; className: string }) {
  const context = useContext(PatreonContext);
  const manager = useWindowManager();
  return <button type="button" className={`${className} patron-locked-trigger`} aria-label="Patron content — access denied" onClick={() => {
    context?.showDenied();
    manager.restoreWindow(deniedID);
  }}>{children}</button>;
}

export function AccessDeniedWindow() {
  const context = useContext(PatreonContext);
  if (!context?.deniedUsed) return null;
  const { viewer, enabled, joinURL } = context;
  return <RetroWindow id={deniedID} title="ACCESS DENIED" defaultPosition={{ x: 80, y: 80 }} defaultSize={{ width: 480, height: 360 }}>
    <div className="access-denied-content">
      <span className="classified-x" aria-hidden="true">X</span>
      <h2>CLASSIFIED STUDIO MATERIAL</h2>
      <p>{viewer.verification === 'unavailable' ? 'PATREON VERIFICATION TEMPORARILY UNAVAILABLE — MATERIAL REMAINS LOCKED.' : viewer.signedIn ? 'PATREON ID VERIFIED — CLEARANCE INSUFFICIENT' : 'YOUR CURRENT CLEARANCE LEVEL IS INSUFFICIENT.'}</p>
      <p>FINANCIAL SUPPORT OF STUDIO MIGRAINZ MAY RESULT IN IRRESPONSIBLE ACCESS TO CLASSIFIED MATERIAL.</p>
      <PatreonActions enabled={enabled} joinURL={joinURL} signedIn={viewer.signedIn} />
    </div>
  </RetroWindow>;
}
