import Link from "next/link";
import { notFound } from "next/navigation";
import { Directory } from "@/components/Directory";
import { DesktopFolder } from "@/components/DesktopFile";
import { getProjectIdentity, getFactions } from "@/lib/content/queries";

export const metadata = { title: "Factions / Associations" };
export default async function FactionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProjectIdentity((await params).slug);
  if (!project) notFound();
  const factions = await getFactions(project.id);
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/FACTIONS/`} title="FACTIONS">
    <Link className="section-link" href={`/projects/${project.slug}`}>RETURN TO {project.title}</Link>
    <div className="directory-list desktop-file-list">
      {factions.map(faction => {
        const locked = faction.access?.state === "redacted" || faction.access?.state === "patron";
        const title = locked ? faction.access?.displayTitle || faction.name : faction.name;
        return <DesktopFolder key={faction.slug} label={`${title}/`}
        href={`/projects/${project.slug}/factions/${faction.slug}`} subtitle={locked ? faction.access?.teaser || (faction.access?.state === "patron" ? "CLASSIFIED / PATRON" : faction.access?.redactionLabel || "REDACTED") : faction.description || faction.type}
        metadata={[{ label: "NAME", value: title }, { label: "PROJECT", value: project.title },
          ...(locked ? [{ label: "ACCESS", value: faction.access?.state === "patron" ? "CLASSIFIED" : "REDACTED" }] : [
            { label: "TYPE", value: faction.type }, { label: "STATUS", value: faction.status || '' },
            { label: "UPDATED", value: faction.updatedAt.slice(0, 10) }])] } />;
      })}
    </div>
    {!factions.length && <p>No faction or association records filed yet.</p>}
    <Link className="section-link" href={`/projects/${project.slug}/characters`}>ALL CHARACTERS / INCLUDING UNASSIGNED RECORDS</Link>
  </Directory>;
}
