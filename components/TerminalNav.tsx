import Link from "next/link";
import PromoWindow from "./PromoWindow";
import MenuLabel from "./MenuLabel";

export default function TerminalNav() {
  return (
    <nav className="terminal-nav" aria-label="Primary navigation">
      <Link id="projects" href="/projects">
        <MenuLabel number="01" file="projects.db" name="Project database" />
      </Link>
      <Link id="tracker" href="/tracker">
        <MenuLabel number="02" file="operations.log" name="Current operations" />
      </Link>
      <PromoWindow kind="shop" number="03" />
      <Link id="archive" href="/archive">
        <MenuLabel number="04" file="archive/" name="Archive" />
      </Link>
      <Link id="about" href="/about">
        <MenuLabel number="05" file="info.txt" name="Information" />
      </Link>
      <PromoWindow kind="patreon" number="06" />
      <Link href="/comics">
        <MenuLabel number="07" file="comics/" name="Comics / reader" />
      </Link>
    </nav>
  );
}
