import type { Metadata } from "next";
import type { ReactNode } from "react";
import StartupSequence from "@/components/StartupSequence";
import TerminalHeader from "@/components/TerminalHeader";
import { SoundProvider } from "@/components/SoundProvider";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><SoundProvider><StartupSequence>
          <a className="skip-link" href="#top">
            SKIP TO CONTENT
          </a>
          <div className="crt" aria-hidden="true" />
          <TerminalHeader />
          <main className="shell" id="top" tabIndex={-1}>
            {children}
          </main>
          <footer className="shell footer">
            <span>© 2026 MIGRAINZ</span>
            <span>PUBLIC NODE / UNAUTHENTICATED ACCESS</span>
          </footer>
        </StartupSequence></SoundProvider></body>
    </html>
  );
}
