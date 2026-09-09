import Link from "next/link";
import PromoWindow from "./PromoWindow";

export default function TerminalNav() {
  return (
    <nav className="terminal-nav" aria-label="Primary navigation">
      <Link id="projects" href="/projects">
        <span>01</span>PROJECT DATABASE
      </Link>
      <Link id="tracker" href="/tracker">
        <span>02</span>CURRENT OPERATIONS
      </Link>
      <PromoWindow kind="shop" number="03" />
      <Link id="archive" href="/archive">
        <span>04</span>ARCHIVE
      </Link>
      <Link id="about" href="/about">
        <span>05</span>INFORMATION
      </Link>
      <PromoWindow kind="patreon" number="06" />
      <Link href="/comics">
        <span>07</span>COMICS / READER
      </Link>
    </nav>
  );
}
