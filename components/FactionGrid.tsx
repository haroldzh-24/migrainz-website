import Link from 'next/link';
import { DesktopFolder } from '@/components/DesktopFile';
import type { getFactions } from '@/lib/content/queries';

export default function FactionGrid({ project, factions }: {
  project: { slug: string; title: string };
  factions: Awaited<ReturnType<typeof getFactions>>;
}) {
  return <>
    <div className="directory-list desktop-file-list faction-grid">
      {factions.map(faction => <DesktopFolder key={faction.slug} imagePreview thumbnail={faction.emblemImage}
        classification={faction.classification} safeLabel={faction.safeLabel} label={`${faction.name}/`}
        href={`/projects/${project.slug}/factions/${faction.slug}`} subtitle={faction.description || faction.type}
        metadata={[{ label: 'NAME', value: faction.name }, { label: 'PROJECT', value: project.title },
          { label: 'TYPE', value: faction.type }, { label: 'STATUS', value: faction.status || '' },
          { label: 'UPDATED', value: faction.updatedAt.slice(0, 10) }]} />)}
    </div>
    {!factions.length && <p>No faction or association records filed yet.</p>}
    <Link className="section-link" href={`/projects/${project.slug}/characters`}>ALL CHARACTERS / INCLUDING UNASSIGNED RECORDS</Link>
  </>;
}
