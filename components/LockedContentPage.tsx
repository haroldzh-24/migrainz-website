import { notFound } from 'next/navigation';
import { Directory } from '@/components/Directory';
import ClassifiedPlaceholder from '@/components/ClassifiedPlaceholder';
import { PatreonActions } from '@/components/PatreonAccess';
import { lockedRecord, type LockedRoute } from '@/lib/content/locked';
import { viewerAccess } from '@/lib/patreon/viewer';
import { patreonConfig, patreonJoinURL } from '@/lib/patreon/server';

export async function lockedPageTitle(route: LockedRoute) {
  const locked = await lockedRecord(route);
  return locked ? locked.label || 'CLASSIFIED STUDIO MATERIAL' : 'Record not found';
}

export async function lockedPageOrNotFound(route: LockedRoute) {
  const locked = await lockedRecord(route);
  if (!locked) notFound();
  const viewer = await viewerAccess();
  return <Directory path="SYS:/CLASSIFIED/" title={locked.label || 'CLASSIFIED STUDIO MATERIAL'}>
    <p className="lede">This material requires an entitled Studio Migrainz Patreon membership.</p>
    <ClassifiedPlaceholder classification="patron" variant="inline" />
    <ClassifiedPlaceholder classification="patron" variant="media" />
    <PatreonActions enabled={Boolean(patreonConfig())} joinURL={patreonJoinURL()} signedIn={viewer.signedIn} />
  </Directory>;
}
