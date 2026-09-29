import ClassifiedPlaceholder from "@/components/ClassifiedPlaceholder";
import Watcher from "@/components/Watcher";
import TerminalNav from "@/components/TerminalNav";
import Link from "next/link";
import { getHomepageData } from "@/lib/content/queries";
import { chapterHref, projectHref } from "@/lib/content/types";
import { RetroWindow, WindowLauncher } from "@/components/WindowManager";

function dateLabel(value?: string) {
  return value ? value.slice(5).replace("-", "/") : "--/--";
}

export default async function Home() {
  const { projects, archiveItems } = await getHomepageData();
  const featured = projects
    .filter((project) => !project.status.toUpperCase().includes("ARCHIVED"))
    .slice(0, 2);
  const updates = projects
    .flatMap((project) =>
      project.notes.map((note) => ({ ...note, project })),
    )
    .sort((a, b) => (a.listingOrder ?? 0) - (b.listingOrder ?? 0))
    .slice(0, 5);
  const chapters = projects.flatMap((project) =>
    project.chapters.map((chapter) => ({ project, chapter })),
  );
  const trackerProject = featured.find((project) => project.phases.length > 0);

  return (
    <>
      <section className="hero panel-grid">
        <div className="hero-copy">
          <p className="eyebrow">PUBLIC SYSTEM INDEX / REV. 0.2</p>
          <h1>
            MIGRAINZ
            <br />
            ARCHIVE &amp;
            <br />
            PROJECTS
          </h1>
          <p className="lede">
            A public terminal for ongoing work, finished projects, studio
            debris, production logs and releases.
          </p>
          <TerminalNav />
        </div>
        <Watcher />
      </section>

      <div className="home-terminal" aria-label="Studio activity terminal">
        <div className="section-head home-terminal-head">
          <div><span>SYS</span><h2>STUDIO TERMINAL</h2></div>
          <p>PUBLIC NODE / READ ONLY</p>
        </div>

        <div className="desktop-launchers">
          <WindowLauncher id="latest">[ LATEST ]</WindowLauncher>
          <WindowLauncher id="system">[ SYSTEM ]</WindowLauncher>
          <RetroWindow id="latest" title="LATEST" defaultOpen={false} defaultPosition={{ x: 12, y: 12 }} defaultSize={{ width: 620, height: 300 }}>
            <div className="terminal-panel-head">
              <h2>LATEST</h2><Link href="/tracker">OPEN FEED →</Link>
            </div>
            <div className="home-feed">
              {updates.length ? updates.map((update, index) => update.classification ? <ClassifiedPlaceholder key={index} classification={update.classification} label={update.safeLabel} variant="inline" /> : (
                <Link className="home-feed-row" href={projectHref(update.project)} key={`${update.project.slug}-${update.date}-${index}`}>
                  <time dateTime={update.date}>{dateLabel(update.date)}</time>
                  <span><b>{update.project.id}</b> / {update.text}</span>
                  <em>OK</em>
                </Link>
              )) : <p className="terminal-empty">NO PUBLIC ACTIVITY FILED.</p>}
            </div>
          </RetroWindow>
        </div>
        <div className="home-terminal-grid">

          <section className="terminal-panel projects-panel">
            <div className="terminal-panel-head">
              <h2>PROJECTS</h2><Link href="/projects">DATABASE →</Link>
            </div>
            <div className="home-project-list">
              {featured.length ? featured.map((project) => project.classification ? <ClassifiedPlaceholder key={project.slug} classification={project.classification} label={project.safeLabel} /> : (
                <Link className="home-project-row" href={projectHref(project)} key={project.slug}>
                  <span className={`home-project-mark ${project.art}`}>{project.id}</span>
                  <span><b>{project.title}</b><small>{project.status} / UPDATED {project.updated}</small></span>
                  <span aria-hidden="true">↗</span>
                </Link>
              )) : <p className="terminal-empty">NO PUBLIC PROJECTS MOUNTED.</p>}
            </div>
          </section>

          <section className="terminal-panel comics-panel">
            <div className="terminal-panel-head">
              <h2>COMICS</h2><Link href="/comics">READER →</Link>
            </div>
            {chapters.length ? chapters.slice(0, 3).map(({ project, chapter }) => chapter.classification ? <ClassifiedPlaceholder key={`${project.slug}-${chapter.slug}`} classification={chapter.classification} label={chapter.safeLabel} /> : (
              <Link className="home-directory-row" href={chapterHref(project, chapter)} key={`${project.slug}-${chapter.slug}`}>
                <span>↳</span><b>{project.title} / {chapter.title}</b><em>{chapter.pages.length} PAGES</em>
              </Link>
            )) : <p className="terminal-empty">NO READABLE CHAPTERS.</p>}
          </section>

          <section className="terminal-panel tracker-panel">
            <div className="terminal-panel-head">
              <h2>TRACKER</h2><Link href="/tracker">OPERATIONS →</Link>
            </div>
            {trackerProject ? <>
              <Link className="tracker-project-link" href={projectHref(trackerProject)}>{trackerProject.id} / {trackerProject.title}</Link>
              {trackerProject.phases.slice(0, 3).map((phase, index) => phase.classification ? <ClassifiedPlaceholder key={index} classification={phase.classification} label={phase.safeLabel} variant="inline" /> : (
                <div className="home-progress-row" key={phase.label}>
                  <span>{phase.label}</span><i><b style={{ width: `${phase.percent}%` }} /></i><strong>{phase.percent}%</strong>
                </div>
              ))}
            </> : <p className="terminal-empty">NO ACTIVE OPERATIONS.</p>}
          </section>
        </div>

        <div className="home-terminal-lower">
          <section className="terminal-panel archive-panel">
            <div className="terminal-panel-head"><h2>ARCHIVE</h2><Link href="/archive">RECOVERED FILES →</Link></div>
            {archiveItems.length ? archiveItems.slice(0, 3).map((item) => item.classification ? <ClassifiedPlaceholder key={item.slug} classification={item.classification} label={item.safeLabel} /> : (
              <Link className="home-directory-row" href={`/archive#item-${item.slug}`} key={item.slug}>
                <span>{dateLabel(item.date)}</span><b>{item.title}</b><em>{item.category || "UNFILED"}</em>
              </Link>
            )) : <p className="terminal-empty">ARCHIVE INDEX AWAITING FILES.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
