import Watcher from "@/components/Watcher";
import TerminalNav from "@/components/TerminalNav";
import StartupSequence from "@/components/StartupSequence";

export default function Home() {
  return (
    <section className="hero panel-grid">
      <StartupSequence />
      <div className="hero-copy">
        <p className="eyebrow">PUBLIC SYSTEM INDEX / REV. 0.2</p>
        <h1>
          ARCHIVE.
          <br />
          PROJECTS.
          <br />
          OBJECTS.
        </h1>
        <p className="lede">
          A public terminal for ongoing work, finished projects, studio
          debris, production logs and releases.
        </p>
        <TerminalNav />
      </div>
      <Watcher />
    </section>
  );
}
