import 'server-only';
import { getPayload, type TypedCollectionSelect, type Where } from 'payload';
import config from '@payload-config';
import { contentRequest, viewerAccess } from '@/lib/patreon/viewer';
import { entitledTo } from '@/lib/patreon/types';

type Kind = 'projects' | 'characters' | 'factions' | 'equipment' | 'chapters';
export type LockedRoute = { projectSlug: string; kind?: Kind; slug?: string };
type Metadata = { id: number; accessLevel: string; listingSummary?: string | null; patreonTierIDs?: unknown; comic?: number; faction?: number | null };

// Only an explicitly safe label can cross into a locked page. Route slugs are
// query inputs, never fetched protected titles or copied into its HTML.
export async function lockedRecord({ projectSlug, kind = 'projects', slug }: LockedRoute): Promise<{ label?: string } | undefined> {
  const cms = await getPayload({ config });
  const req = await contentRequest();
  const read = async <C extends Kind | 'comics'>(collection: C, where: Where) => {
    const result = await cms.find({ req, collection, overrideAccess: true, depth: 0, pagination: false,
      where: { and: [{ _status: { equals: 'published' } }, { listingVisibility: { equals: 'public' } }, { accessLevel: { in: ['public', 'patron'] } }, where] },
      select: { accessLevel: true, listingSummary: true, patreonTierIDs: true,
        ...(collection === 'chapters' ? { comic: true } : {}), ...(collection === 'equipment' ? { faction: true } : {}) } as TypedCollectionSelect[C] });
    return result.docs as unknown as Metadata[];
  };
  const project = (await read('projects', { slug: { equals: projectSlug } }))[0];
  if (!project) return undefined;
  const chain = [project];
  if (kind !== 'projects') {
    if (!slug) return undefined;
    if (kind === 'chapters') {
      const comics = await read('comics', { project: { equals: project.id } });
      const chapter = (await read('chapters', { and: [{ slug: { equals: slug } }, { comic: { in: comics.map(doc => doc.id) } }] }))[0];
      const comic = comics.find(doc => doc.id === chapter?.comic);
      if (!chapter || !comic) return undefined;
      chain.push(comic, chapter);
    } else {
      const record = (await read(kind, { and: [{ slug: { equals: slug } }, { project: { equals: project.id } }] }))[0];
      if (!record) return undefined;
      if (kind === 'equipment' && record.faction != null) {
        const faction = (await read('factions', { and: [{ id: { equals: record.faction } }, { project: { equals: project.id } }] }))[0];
        if (!faction) return undefined;
        chain.push(faction);
      }
      chain.push(record);
    }
  }
  const viewer = await viewerAccess();
  const locked = chain.find(doc => doc.accessLevel === 'patron' && !entitledTo(doc.patreonTierIDs, viewer));
  return locked ? { label: locked.listingSummary || undefined } : undefined;
}
