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
import localFont from "next/font/local";
import InlineScript from "@/components/InlineScript";
import HighlightEffects from "@/components/HighlightEffects";
import "./globals.css";

// Bundled locally (SIL OFL, app/fonts/IBM-Plex-Mono-OFL.txt) so the build never reaches a font host.
const plexMono = localFont({
  src: [
    { path: "../fonts/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/ibm-plex-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
  fallback: ["Courier New", "Courier", "monospace"],
});

// Runs before first paint so a saved CRT mode or phosphor colour never flashes the default.
const crtModeScript = `try{var d=document.documentElement.dataset,m=localStorage.getItem("crt-effects"),p=localStorage.getItem("crt-phosphor");if(m==="on"||m==="reduced"||m==="off")d.crt=m;if(p==="green"||p==="amber")d.phosphor=p}catch(e){}`;

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
    <html lang="en" data-scroll-behavior="smooth" data-crt="on" data-phosphor="green" className={plexMono.variable} suppressHydrationWarning>
      <head><InlineScript code={crtModeScript} /></head>
      <body>
        {/* Display-time recolour, black to --crt-bg through --crt-dim and --crt-text to white at --crt-bright.
            Used through var(--crt-tune-filter), which html[data-phosphor] points at the matching filter. */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
          <filter id="crt-tune" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.039 0.373 0.659 0.831" />
              <feFuncG type="table" tableValues="0.055 0.541 0.847 0.961" />
              <feFuncB type="table" tableValues="0.043 0.420 0.690 0.855" />
            </feComponentTransfer>
          </filter>
          <filter id="crt-tune-amber" colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.055 0.627 0.922 1" />
              <feFuncG type="table" tableValues="0.039 0.478 0.769 0.878" />
              <feFuncB type="table" tableValues="0.024 0.282 0.549 0.690" />
            </feComponentTransfer>
          </filter>
        </svg><PatreonAccessProvider viewer={viewer} enabled={Boolean(patreonConfig())} joinURL={patreonJoinURL()}><SoundProvider><HighlightEffects /><WindowManagerProvider><StartupSequence>
          <a className="skip-link" href="#top">
            SKIP TO CONTENT
          </a>
          <div className="crt" aria-hidden="true" />
          <div className="crt-bezel" aria-hidden="true" />
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
