import type { Metadata } from "next";
import type { ReactNode } from "react";
import TerminalHeader from "@/components/TerminalHeader";
import "./globals.css";

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
      <body>
        <a className="skip-link" href="#top">
          SKIP TO CONTENT
        </a>
        <div className="crt" aria-hidden="true" />
        <TerminalHeader />
        <main className="shell" id="top">
          {children}
        </main>
        <footer className="shell footer">
          <span>© 2026 MIGRAINZ</span>
          <span>PUBLIC NODE / UNAUTHENTICATED ACCESS</span>
        </footer>
      </body>
    </html>
  );
}
