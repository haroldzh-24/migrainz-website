import Link from "next/link";
import TerminalNav from "@/components/TerminalNav";
import SchematicSpinner from "@/components/SchematicSpinner";
import { WindowLauncher } from "@/components/WindowManager";
import HomeSignal, { type HomeChannel } from "@/components/home/HomeSignal";
import HomeTerminal from "@/components/home/HomeTerminal";
import { SessionClock, SignalGlobe } from "@/components/home/HomeStatus";
import { getHomepageData, getNewestSchematic } from "@/lib/content/queries";
import { chapterHref, projectHref } from "@/lib/content/types";
import { bootClearance } from "@/lib/content/boot";
import { viewerAccess } from "@/lib/patreon/viewer";
import { dotted } from "@/lib/home/text-graphics";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVITY_WEEKS = 26;

function dateLabel(value?: string) {
  return value ? value.slice(5).replace("-", "/") : "--/--";
}

// Homepage first screen (design canvas board 23, Harold 2026-10-29): the directory and a terminal on the left, the
// Watcher in the centre, node status on the right, recent files below. The Watcher column comes first in the source (it
// holds the page title), so phones and screen readers start there; the grid areas put it in the middle on wider screens. Every panel reads the public listing data
// getHomepageData already loads; classified records never show here beyond the existing placeholders.
export default async function Home() {
  const [{ projects, archiveItems }, schematic, viewer] = await Promise.all([getHomepageData(), getNewestSchematic(), viewerAccess()]);
  const open = projects.filter(project => !project.classification);
  const active = open.filter(project => !project.status.toUpperCase().includes("ARCHIVED"));
  const updates = open
    .flatMap(project => project.notes.filter(note => !note.classification).map(note => ({ ...note, project })))
    .sort((a, b) => (a.listingOrder ?? 0) - (b.listingOrder ?? 0) || b.date.localeCompare(a.date));
  const chapters = open.flatMap(project => project.chapters.filter(chapter => !chapter.classification && chapter.pages.length).map(chapter => ({ project, chapter })));
  const latest = chapters.at(-1);
  const latestPage = latest?.chapter.pages.filter(page => !page.classification).at(-1);
  const tracker = active.find(project => project.phases.some(phase => !phase.classification));
  const phases = tracker?.phases.filter(phase => !phase.classification).slice(0, 2) ?? [];
  const files = archiveItems.filter(item => !item.classification);
  const clearance = bootClearance(viewer).value;

  // Weekly counts of public updates over the last 26 weeks, oldest first.
  const now = Date.now();
  const weeks = Array.from({ length: ACTIVITY_WEEKS }, () => 0);
  for (const update of updates) {
    const age = Math.floor((now - Date.parse(update.date)) / WEEK_MS);
    if (age >= 0 && age < ACTIVITY_WEEKS) weeks[ACTIVITY_WEEKS - 1 - age] += 1;
  }
  const busiest = Math.max(...weeks);
  const recentCount = weeks.reduce((sum, count) => sum + count, 0);

  const channels: Record<string, HomeChannel> = {
    projects: { name: "PROJECTS", ext: ".DB", caption: active.length ? `${active.length} public project${active.length === 1 ? "" : "s"} mounted. Latest: ${active[0].title}.` : "No public projects mounted yet.",
      lines: open.slice(0, 4).map(project => dotted(`${project.id}  ${project.title}`, project.status.toUpperCase())) },
    comics: { name: "COMICS", ext: "/", caption: "Read chapters page by page, fitted to your screen.",
      lines: chapters.slice(-4).map(({ project, chapter }) => dotted(`${project.title} / ${chapter.title}`, `${chapter.pages.length} PAGES`)) },
    operations: { name: "OPERATIONS", ext: ".LOG", caption: "What is being worked on right now, filed by date.",
      lines: phases.length ? phases.map(phase => dotted(phase.label, `${phase.percent}%`)) : ["NO ACTIVE OPERATIONS"] },
    archive: { name: "ARCHIVE", ext: "/", caption: "Recovered files: sketches, studies and studio debris.",
      lines: files.length ? files.slice(0, 4).map(item => dotted(`${dateLabel(item.date)}  ${item.title}`, (item.category || "FILE").toUpperCase())) : ["ARCHIVE INDEX AWAITING FILES"] },
    info: { name: "INFO", ext: ".TXT", caption: "Who runs this node, and how to get in touch.", lines: ["STUDIO MIGRAINZ", "Artwork, comics, objects,", "works in progress."] },
    shop: { name: "REQUISITIONS", ext: ".EXE", caption: "Opens the studio store window. No checkout on this site.", lines: ["PRINTS · OBJECTS · ZINES", "STOREFRONT OPENS ELSEWHERE"] },
    patreon: { name: "PATREON", ext: ".KEY", caption: "Patron tiers open sealed files.", lines: [dotted("CLEARANCE", clearance), "SEALED FILES NEED PATRON ACCESS"] },
  };
  for (const key of Object.keys(channels)) if (!channels[key].lines.length) channels[key].lines = ["NO PUBLIC FILES YET"];

  return (
    <>
      <section className="hero home-screen" aria-label="Home">
        <div className="home-col home-center">
          <div className="strip"><span>VISUAL NODE / WATCHER</span><span className="strip-end">01 <i>|</i> 012</span></div>
          <section className="pnl home-watcher">
            <div className="pnl-h"><span><b>WATCHER</b><i> .LIVE</i></span><WindowLauncher id="system">[ SYSTEM ]</WindowLauncher></div>
            <HomeSignal channels={channels} />
          </section>
          {recentCount > 0 && (
            <section className="pnl home-activity-panel" aria-label="Activity">
              <div className="pnl-h"><span><b>ACTIVITY</b><i> .LOG</i></span><span className="pnl-end">26 WEEKS</span></div>
              <span className="home-activity" aria-hidden="true">
                {weeks.map((count, index) => <i key={index} style={{ height: `${busiest ? Math.max(4, count / busiest * 100) : 4}%` }} data-empty={count === 0 || undefined} />)}
              </span>
              <span className="home-tile-foot">{recentCount} public update{recentCount === 1 ? "" : "s"} in the last 26 weeks</span>
            </section>
          )}
        </div>

        <div className="home-col home-left">
          <div className="strip"><span>C:\MIGRAINZ&gt; DIR</span><span className="strip-end">7 FILES</span></div>
          <p className="lede">A public terminal for ongoing work, finished projects, studio debris, production logs and releases.</p>
          <section className="pnl home-directory" aria-label="Directory">
            <div className="pnl-h"><span><b>DIRECTORY</b><i> .DIR</i></span><span className="pnl-end">END. PROGRAM</span></div>
            <TerminalNav />
          </section>
          <HomeTerminal clearance={clearance} projects={open.map(project => ({ slug: project.slug, code: project.id, title: project.title, status: project.status.toUpperCase() }))} />
        </div>

        <aside className="home-col home-right" aria-label="Node status">
          <div className="strip"><span>NODE STATUS</span><span className="strip-end">01 <i>|</i> 012</span></div>
          <section className="pnl" aria-labelledby="home-transmissions">
            <div className="pnl-h"><span><b id="home-transmissions">TRANSMISSIONS</b><i> .LOG</i></span><span className="pnl-end">{updates.length ? `${Math.min(3, updates.length)} NEW` : "IDLE"}</span></div>
            {updates.length ? (
              <ol className="home-transmissions">
                {updates.slice(0, 3).map((update, index) => (
                  <li key={`${update.project.slug}-${update.date}-${index}`}>
                    <Link href={projectHref(update.project)}><time dateTime={update.date}>{dateLabel(update.date)}</time> <b>{update.project.id}</b><span>{update.text}</span></Link>
                  </li>
                ))}
              </ol>
            ) : <p className="terminal-empty home-pad">NO PUBLIC ACTIVITY FILED.</p>}
            <Link className="home-more" href="/tracker">ALL TRANSMISSIONS ▸</Link>
          </section>
          <section className="pnl" aria-label="Session time">
            <div className="pnl-h"><span><b>SESSION</b><i> .TIME</i></span><span className="pnl-end">LIVE</span></div>
            <SessionClock />
          </section>
          <section className="pnl" aria-label="Signal globe">
            <div className="pnl-h"><span><b>SIGNAL</b><i> .GLOBE</i></span><span className="pnl-end">NODE 01 · TX</span></div>
            <SignalGlobe />
          </section>
          <section className="pnl" aria-label="Clearance">
            <div className="pnl-h"><span><b>CLEARANCE</b><i> .SYS</i></span><span className="pnl-end">{clearance}</span></div>
            <div className="home-pad">
              <p className="home-clearance">{clearance}</p>
              <p className="home-note">Patron tiers open sealed files. <Link href="/patreon">Upgrade clearance</Link></p>
            </div>
          </section>
        </aside>
      </section>

      {(latestPage || schematic || phases.length > 0) && (
        <section className="home-recent" aria-label="Recent files">
          <div className="strip"><span>RECENT FILES</span><span className="strip-end">LIVE FEED <i>|</i> 012</span></div>
          <div className="home-tiles">
            {latest && latestPage && (
              <Link className="home-tile" href={chapterHref(latest.project, latest.chapter)}>
                <span className="home-tile-k">LATEST PAGE</span>
                <span className="home-tile-row">
                  <img className="home-tile-page" src={latestPage.thumbnailSrc ?? latestPage.src} alt={latestPage.alt || `${latest.chapter.title}, page ${latest.chapter.pages.length}`} loading="lazy" />
                  <span><b>{latest.project.title}</b><span>{latest.chapter.title}</span><span>P.{latest.chapter.pages.length}</span><em>READ ▸</em></span>
                </span>
              </Link>
            )}
            {schematic && (
              <Link className="home-tile" href={schematic.href}>
                <span className="home-tile-k">NEWEST SCHEMATIC</span>
                <span className="home-tile-media"><SchematicSpinner src={schematic.src} poster={schematic.poster} label={`${schematic.name} schematic`} /></span>
                <span className="home-tile-foot"><b>{schematic.name}</b> · {schematic.file}</span>
              </Link>
            )}
            {tracker && phases.length > 0 && (
              <Link className="home-tile" href="/tracker">
                <span className="home-tile-k">OPERATIONS · {tracker.id}</span>
                <span className="home-tile-bars">
                  {phases.map(phase => (
                    <span key={phase.label} className="home-progress"><span><span>{phase.label}</span><b>{phase.percent}%</b></span><i aria-hidden="true"><b style={{ width: `${Math.max(0, Math.min(100, phase.percent))}%` }} /></i></span>
                  ))}
                </span>
              </Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}
