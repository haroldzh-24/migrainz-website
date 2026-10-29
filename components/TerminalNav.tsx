import Link from "next/link";
import PromoWindow from "./PromoWindow";
import MenuLabel from "./MenuLabel";

// The homepage directory (design canvas boards 1 and 23): readable files first, the shop and Patreon promo windows at
// the bottom as locked system files. data-channel names the preview the Watcher panel shows while a row is hovered or
// focused (components/home/HomeSignal.tsx). The ids are the homepage anchors (projects, tracker, archive, about, shop,
// patreon) and stay.
export default function TerminalNav() {
  return (
    <nav className="terminal-nav" aria-label="Primary navigation">
      <Link id="projects" href="/projects" data-channel="projects">
        <MenuLabel number="01" file="projects.db" name="Project database" />
      </Link>
      <Link href="/comics" data-channel="comics">
        <MenuLabel number="02" file="comics/" name="Comics / reader" />
      </Link>
      <Link id="tracker" href="/tracker" data-channel="operations">
        <MenuLabel number="03" file="operations.log" name="Current operations" />
      </Link>
      <Link id="archive" href="/archive" data-channel="archive">
        <MenuLabel number="04" file="archive/" name="Archive" />
      </Link>
      <Link id="about" href="/about" data-channel="info">
        <MenuLabel number="05" file="info.txt" name="Information" />
      </Link>
      <PromoWindow kind="shop" number="06" />
      <PromoWindow kind="patreon" number="07" />
    </nav>
  );
}
