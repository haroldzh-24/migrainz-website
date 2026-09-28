import { Directory, DirectoryLink } from "@/components/Directory";
import { getProjects, getArchiveItems } from "@/lib/content/queries";
import ContentGallery from "@/components/ContentGallery";

export const metadata = { title: "ARCHIVE" };

export default async function Page() {
  const projects = await getProjects();
  const items = await getArchiveItems();
  return (
    <Directory path="SYS:/ARCHIVE/" title="ARCHIVE">
      <section className="split section-block">
        <div id="archive" className="archive-block">
          <div className="section-head compact">
            <div>
              <span>04</span>
              <h2>ARCHIVE</h2>
            </div>
          </div>
          <div className="archive-list">
            {items.map((item) => (
              <article className="section-block" id={`item-${item.slug}`} key={item.slug}>
                <p className="eyebrow">{item.category} / {item.date}</p>
                <h3>{item.title}</h3><p>{item.description}</p>
                <ContentGallery images={item.files} />
              </article>
            ))}
            <DirectoryLink
              href="/projects/blushland/characters"
              name="CHARACTER STUDIES"
              meta="1 SAMPLE"
            />
            {[
              "ENVIRONMENT BLOCKOUTS",
              "ABANDONED / UNFILED",
              "PRINT DEVELOPMENT",
            ].map((name) => (
              <div className="directory-row" key={name}>
                <span>—</span>
                <strong>{name}</strong>
                <span>NOT FILED YET</span>
              </div>
            ))}
          </div>
        </div>
        <div className="activity-block">
          <div className="section-head compact">
            <div>
              <span>06</span>
              <h2>SYSTEM ACTIVITY</h2>
            </div>
          </div>
          <p className="eyebrow">SAMPLE PRODUCTION LOG</p>
          <div className="activity-feed">
            {(projects[0]?.notes ?? []).map((note) => (
              <p key={note.date}>
                <time dateTime={note.date}>
                  {note.date.slice(5).replace("-", "/")}
                </time>
                <span>{note.text}</span>
                <b>OK</b>
              </p>
            ))}
          </div>
        </div>
      </section>
    </Directory>
  );
}
