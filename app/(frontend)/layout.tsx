import type { Metadata } from "next";
import type { ReactNode } from "react";
import StartupSequence from "@/components/StartupSequence";
import TerminalHeader from "@/components/TerminalHeader";
import { SoundProvider } from "@/components/SoundProvider";
import { PublicWindowWorkspace, WindowManagerProvider } from "@/components/WindowManager";
import ArtViewer from "@/components/ArtViewer";
import PixelMonitorDesktop from "@/components/PixelMonitorDesktop";
import { AccessDeniedWindow, PatreonAccessProvider } from '@/components/PatreonAccess';
import { viewerAccess } from '@/lib/patreon/viewer';
import { patreonConfig, patreonJoinURL } from '@/lib/patreon/server';
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "MIGRAINZ // PUBLIC ACCESS TERMINAL",
    template: "%s // MIGRAINZ",
  },
  description:
    "Studio Migrainz: a public terminal for projects, artwork, comics, production logs and studio archives.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await viewerAccess();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><PatreonAccessProvider viewer={viewer} enabled={Boolean(patreonConfig())} joinURL={patreonJoinURL()}><SoundProvider><WindowManagerProvider><StartupSequence>
          <a className="skip-link" href="#top">
            SKIP TO CONTENT
          </a>
          <div className="crt" aria-hidden="true" />
          <TerminalHeader />
          <main className="shell" id="top" tabIndex={-1}>
            {children}
          </main>
          <PublicWindowWorkspace />
          <PixelMonitorDesktop />
          <ArtViewer />
          <AccessDeniedWindow />
          <footer className="shell footer">
            <span>© 2026 MIGRAINZ</span>
            <span>{viewer.signedIn ? 'PATREON ID VERIFIED' : 'PUBLIC NODE / UNAUTHENTICATED ACCESS'}</span>
          </footer>
        </StartupSequence></WindowManagerProvider></SoundProvider></PatreonAccessProvider></body>
    </html>
  );
}
