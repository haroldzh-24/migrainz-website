import { lockedPageOrNotFound } from "@/components/LockedContentPage";
import Link from "next/link";
import { Directory } from "@/components/Directory";
import FactionGrid from "@/components/FactionGrid";
import { getProjectIdentity, getFactions } from "@/lib/content/queries";

export const metadata = { title: "Factions / Associations" };
export default async function FactionsPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProjectIdentity((await params).slug);
  if (!project) return lockedPageOrNotFound({ projectSlug: (await params).slug });
  const factions = await getFactions(project.id);
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/FACTIONS/`} title="FACTIONS">
    <Link className="section-link" href={`/projects/${project.slug}`}>RETURN TO {project.title}</Link>
    <FactionGrid project={project} factions={factions} />
  </Directory>;
}
