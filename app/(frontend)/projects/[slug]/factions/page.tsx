import { lockedPageOrNotFound } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory } from "@/components/Directory";
import { DesktopFolder } from "@/components/DesktopFile";
import { getProjectIdentity, getFactions } from "@/lib/content/queries";

export const metadata = { title: "Factions / Associations" };
export default async function FactionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProjectIdentity((await params).slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: (await params).slug });
  const factions = await getFactions(project.id);
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/FACTIONS/`} title="FACTIONS">
    <Link className="section-link" href={`/projects/${project.slug}`}>RETURN TO {project.title}</Link>
    <div className="directory-list desktop-file-list">
      {factions.map(faction => <DesktopFolder key={faction.slug} classification={faction.classification} safeLabel={faction.safeLabel} label={`${faction.name}/`}
        href={`/projects/${project.slug}/factions/${faction.slug}`} subtitle={faction.description || faction.type}
        metadata={[{ label: "NAME", value: faction.name }, { label: "PROJECT", value: project.title },
          { label: "TYPE", value: faction.type }, { label: "STATUS", value: faction.status || '' },
          { label: "UPDATED", value: faction.updatedAt.slice(0, 10) }]} />)}
    </div>
    {!factions.length && <p>No faction or association records filed yet.</p>}
    <Link className="section-link" href={`/projects/${project.slug}/characters`}>ALL CHARACTERS / INCLUDING UNASSIGNED RECORDS</Link>
  </Directory>;
}
