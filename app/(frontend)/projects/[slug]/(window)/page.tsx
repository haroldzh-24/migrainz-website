import Link from "next/link";
import type { ReactNode } from "react";
import { lockedPageOrNotFound, lockedPageTitle } from "@/components/LockedContentPage";
import ClassifiedPlaceholder from "@/components/ClassifiedPlaceholder";
import { Directory, DirectoryLink } from "@/components/Directory";
import ProjectTracker from "@/components/ProjectTracker";
import ContentWriting from "@/components/ContentWriting";
import DesktopFile, { DesktopFolder } from "@/components/DesktopFile";
import ContentGallery from "@/components/ContentGallery";
import FactionGrid from "@/components/FactionGrid";
import DecodeText from "@/components/DecodeText";
import SchematicSpinner from "@/components/SchematicSpinner";
import ScrollFile, { type ScrollFileSection } from "@/components/ScrollFile";
import { getProject, getProjectIdentity, getFactions, getArchiveItems, getLoreIndex, getEquipmentDirectory, getEquipmentTiles } from "@/lib/content/queries";
import { createLoreLinker, equipmentFile } from "@/lib/content/lore";
import { LoreLayout, LoreReferences, LoreText } from "@/components/LoreText";
import { projectHref, chapterHref } from "@/lib/content/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  return { title: project?.title ?? await lockedPageTitle({ projectSlug: (await params).slug }) };
}

const isPDF = (src: string) => /\.pdf(?:\?|$)/i.test(src);

/** One numbered section of the scroll-told file: big outlined number (decoration), small label, heading, content. */
function Section({ section, kicker, heading, children }: { section: ScrollFileSection & { num: string }; kicker?: ReactNode; heading: ReactNode; children: ReactNode }) {
  return <section id={section.id} className="scroll-file-section" aria-labelledby={`${section.id}-title`} data-scroll-section="">
    <span className="scroll-file-num" aria-hidden="true">{section.num}</span>
    {kicker && <div className="scroll-file-kicker">{kicker}</div>}
    {heading}
    {children}
  </section>;
}

// The project overview as one scroll-told file inside the project window (design canvas board 21; batch 26, with the
// plan check's revisions): a header strip with the path and SCROLL nnn%, an ON THIS PAGE index beside the sections (a
// strip at the top on phones), and the sections 01 OVERVIEW, CHARACTERS, EQUIPMENT, CHAPTERS, then every section the
// page had before (FACTIONS, WRITING, ARTWORK, FILES, PRODUCTION) with their anchors. Only existing fields; only
// non-classified rows are counted or shown as cards; a section with no such rows is left out; classified placeholders
// stay where the page showed them (chapters, files, galleries, notes). Titles and text never animate; frames may reveal
// once and the big numbers and key art drift a little (components/ScrollFile.tsx).
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const project = await getProject((await params).slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: (await params).slug });
  const identity = await getProjectIdentity(project.slug);
  const [factions, archiveItems, loreIndex, equipment, tiles] = await Promise.all([
    identity ? getFactions(identity.id) : [],
    getArchiveItems().then(items => items.filter(item => item.projectSlug === project.slug)),
    identity ? getLoreIndex(identity.id) : [],
    identity ? getEquipmentDirectory(identity.id) : [],
    identity ? getEquipmentTiles(identity.id) : [],
  ]);
  // Lore links (board 8) in the description and the writing; the aside sits beside the description.
  const lore = createLoreLinker(loreIndex);
  const description = lore.text(project.description);
  const writing = lore.writing(project.writing);
  const references = lore.used();
  const base = projectHref(project);

  const characters = project.characters.filter(character => !character.classification);
  const factionOf = new Map(loreIndex.flatMap(entry => entry.kind === "character" && entry.faction ? [[entry.key, entry.faction] as const] : []));
  const filed = equipment.filter(item => !item.classification);
  // At most one turning schematic on the page: the first public item that has one.
  const loop = tiles.find(tile => !tile.classification && tile.spin);
  const chapters = project.chapters.filter(chapter => !chapter.classification);
  const sealedChapters = project.chapters.filter(chapter => chapter.classification);
  const keyArt = project.hero && !project.hero.classification && project.hero.src && !isPDF(project.hero.src) ? project.hero : undefined;
  const galleryCount = (images: typeof project.galleries[number]["images"]) => images.filter(image => !image.classification && !isPDF(image.src)).length;

  const wanted: (ScrollFileSection & { show: boolean })[] = [
    { id: "overview", label: "OVERVIEW", show: true },
    { id: "characters", label: "CHARACTERS", show: characters.length > 0 },
    { id: "equipment", label: "EQUIPMENT", show: filed.length > 0 },
    { id: "chapters", label: "CHAPTERS", show: chapters.length > 0 },
    { id: "factions", label: "FACTIONS", show: factions.length > 0 },
    { id: "writing", label: "WRITING", show: Boolean(project.writing) },
    { id: "artwork", label: "ARTWORK", show: project.galleries.length > 0 },
    { id: "files", label: "FILES", show: true },
    { id: "production", label: "PRODUCTION", show: true },
  ];
  const sections = wanted.filter(section => section.show).map((section, index) => ({ id: section.id, label: section.label, num: String(index + 1).padStart(2, "0") }));
  const at = (id: string) => sections.find(section => section.id === id)!;
  const has = (id: string) => sections.some(section => section.id === id);
  const h2 = (id: string, text: string) => <h2 id={`${id}-title`} className="scroll-file-title" tabIndex={-1}>{text}</h2>;

  return (
    <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/`} title={project.title} heading={false} pathLine={false}>
      <ScrollFile name={project.slug.toUpperCase()} code={project.id} phase={project.status} updated={project.updated}
        sections={sections.map(({ id, label }) => ({ id, label }))}>
        <Section section={at("overview")} kicker="OVERVIEW"
          heading={<h1 id="overview-title" className="scroll-file-title scroll-file-name" tabIndex={-1}><DecodeText text={project.title} /></h1>}>
          <p className="eyebrow scroll-file-meta">
            {project.id} / {project.status} / UPDATED <time dateTime={project.updated}>{project.updated}</time>
          </p>
          <figure className="scroll-file-art" data-scroll-art="">
            {keyArt
              ? <img src={keyArt.src} alt={keyArt.alt || `${project.title} key art`} width={keyArt.width} height={keyArt.height} />
              : <div className={`record-image ${project.art}`} role="img" aria-label="Geometric placeholder for the project's key art"><span>KEY ART / PLACEHOLDER</span></div>}
          </figure>
          {project.summary && <p className="scroll-file-logline">{project.summary}</p>}
          <LoreLayout aside={references.length ? <LoreReferences entries={references} /> : null}>
            <p className="lede"><LoreText segments={description} /></p>
          </LoreLayout>
        </Section>

        {has("characters") && <Section section={at("characters")} kicker={`${characters.length} RECORD${characters.length === 1 ? "" : "S"}`} heading={h2("characters", "CHARACTERS")}>
          <ul className="scroll-file-cards">
            {characters.map(character => {
              const portrait = character.images.find(image => !image.classification && image.src && !isPDF(image.src));
              const faction = factionOf.get(`character:${character.slug}`);
              return <li key={character.slug}>
                <Link className="scroll-file-card" href={`${base}/characters/${character.slug}`}>
                  <span className={`scroll-file-portrait scroll-reveal${portrait ? "" : ` ${project.art}`}`}>
                    {portrait && <img src={portrait.thumbnailSrc ?? portrait.src} alt="" loading="lazy" />}
                  </span>
                  <strong>{character.name}</strong>
                  <span className="scroll-file-card-line">{[character.role, faction].filter(Boolean).join(" · ") || "CHARACTER RECORD"}</span>
                </Link>
              </li>;
            })}
          </ul>
          <Link className="section-link" href={`${base}/characters`}>ALL CHARACTERS ▸</Link>
        </Section>}

        {has("equipment") && <Section section={at("equipment")} kicker={`${filed.length} FILED`} heading={h2("equipment", "EQUIPMENT")}>
          <div className="scroll-file-equipment">
            {loop?.spin && <figure className="scroll-file-schematic scroll-reveal">
              <span className="scroll-file-schematic-view">
                <SchematicSpinner decorative src={loop.spin.src} poster={loop.spin.poster} label={`${loop.name} schematic`} />
              </span>
              <figcaption>SCHEMATIC · {equipmentFile(loop.name)}</figcaption>
            </figure>}
            <ul className="scroll-file-rows">
              {filed.map(item => <li key={item.slug}>
                <Link className="scroll-file-row" href={`${base}/equipment/${item.slug}`}>
                  <span>{item.name}</span><span className="scroll-file-row-meta">{equipmentFile(item.name)}</span>
                </Link>
              </li>)}
            </ul>
          </div>
          <Link className="section-link" href={`${base}/equipment`}>EQUIPMENT DIRECTORY ▸</Link>
        </Section>}

        {has("chapters") && <Section section={at("chapters")} kicker="READER" heading={h2("chapters", "CHAPTERS")}>
          <ul className="scroll-file-rows">
            {project.chapters.map((chapter, index) => <li key={chapter.slug}>
              {chapter.classification
                ? <ClassifiedPlaceholder classification={chapter.classification} label={chapter.safeLabel} />
                : <Link className="scroll-file-row" href={chapterHref(project, chapter)}>
                    <span>CH {String(chapter.chapterNumber ?? index + 1).padStart(2, "0")} · {chapter.title}</span>
                    <span className="scroll-file-row-meta">{chapter.pages.length} PAGES</span>
                  </Link>}
            </li>)}
          </ul>
        </Section>}

        {has("factions") && <Section section={at("factions")} heading={h2("factions", "FACTIONS")}>
          <FactionGrid project={project} factions={factions} />
        </Section>}

        {has("writing") && <Section section={at("writing")} heading={h2("writing", "WRITING")}>
          <ContentWriting data={writing} />
        </Section>}

        {has("artwork") && <Section section={at("artwork")} kicker={`${project.galleries.filter(gallery => !gallery.classification).length} GALLERIES`} heading={h2("artwork", "ARTWORK")}>
          {project.galleries.map((gallery) => gallery.classification ? <ClassifiedPlaceholder key={gallery.slug} classification={gallery.classification} label={gallery.safeLabel} variant="media" /> : (
            <section className="section-block" id={`gallery-${gallery.slug}`} key={gallery.slug}>
              <h3>{gallery.title}</h3><p>{gallery.description}</p>
              <DesktopFile label={gallery.title + ".ART"} type="ART" href={base + "#gallery-" + gallery.slug}
                viewerTab={{ id: "gallery:" + project.slug + ":" + gallery.slug, href: base + "#gallery-" + gallery.slug, title: gallery.title, project: project.title, description: gallery.description, images: gallery.images.filter(image => !image.classification && !isPDF(image.src)) }}
                metadata={[{ label: "NAME", value: gallery.title }, { label: "PROJECT", value: project.title }, { label: "TYPE", value: "GALLERY" }, { label: "IMAGE COUNT", value: String(galleryCount(gallery.images)) }]} />
              <ContentGallery images={gallery.images} />
            </section>
          ))}
        </Section>}

        <Section section={at("files")} heading={h2("files", "FILES")}>
          <div className="directory-list">
            {/* Sealed chapters stay listed here when the CHAPTERS section has no public chapter to sit beside. */}
            {!has("chapters") && sealedChapters.map(chapter => <ClassifiedPlaceholder key={chapter.slug} classification={chapter.classification} label={chapter.safeLabel} />)}
            {archiveItems.map(item => <DirectoryLink key={item.slug} classification={item.classification} safeLabel={item.safeLabel} href={`/archive#item-${item.slug}`} name={item.title} meta="ARCHIVE RECORD" />)}
            <DirectoryLink href="#production" name="PRODUCTION NOTES / CHANGELOG" meta={`${project.notes.length} ENTRIES`} />
            {project.galleries.length > 0 && <DesktopFolder
              label="ARTWORK/" href={"#gallery-" + project.galleries[0].slug}
              subtitle={project.galleries.length + " GALLERIES"}
              metadata={[{ label: "PROJECT", value: project.title }, { label: "TYPE", value: "ARTWORK" }]} />}
            {(project.galleries.length ? ["ENVIRONMENTS", "DEVELOPMENT"] : ["ARTWORK", "ENVIRONMENTS", "DEVELOPMENT"]).map((folder) => (
              <div className="directory-row" key={folder}>
                <span>—</span>
                <strong>{folder}/</strong>
                <span>AWAITING FILES</span>
              </div>
            ))}
          </div>
        </Section>

        <Section section={at("production")} kicker="CHANGELOG" heading={h2("production", "PRODUCTION / CHANGELOG")}>
          {project.phases.length ? (
            <ProjectTracker project={project} />
          ) : (
            <p>No production updates filed yet.</p>
          )}
          <div className="production-notes">
            {project.notes.map((note, index) => note.classification ? <ClassifiedPlaceholder key={index} classification={note.classification} label={note.safeLabel} variant="inline" /> : (
              <div key={`${note.date}-${index}`}>
              <p>
                <time dateTime={note.date}>{note.date}</time> // {note.text}
              </p>
              <ContentWriting data={note.writing} />
              <ContentGallery images={note.images ?? []} />
              </div>
            ))}
          </div>
          <div className="scroll-file-end">END OF FILE · {project.id}</div>
        </Section>
      </ScrollFile>
    </Directory>
  );
}
