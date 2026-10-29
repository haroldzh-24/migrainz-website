import Link from 'next/link';
import { Directory } from '@/components/Directory';
import ClassifiedPlaceholder from '@/components/ClassifiedPlaceholder';
import SchematicSpinner, { SpinAngle } from '@/components/SchematicSpinner';
import { lockedPageOrNotFound } from '@/components/LockedContentPage';
import CurrentTabIntoView from '@/components/CurrentTabIntoView';
import { projectSections } from '@/lib/content/project-nav';
import { getEquipmentTiles, getProjectIdentity } from '@/lib/content/queries';

export const metadata = { title: 'Equipment' };

// The equipment directory, out of the project window (design canvas board 22; Harold, 2026-10-29: "take the equipment
// menu out of the white windows tab and make it so that its thumbnails are always spinning and in sync"): a terminal page
// with the project's section tabs and a grid of cards whose schematics all turn on one shared clock, every loop starting
// on the item's right side. Opening a card goes into the project window (the switch to the desktop plays).
export default async function EquipmentDirectory({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const identity = await getProjectIdentity(slug);
  if (!identity) return lockedPageOrNotFound({ projectSlug: slug });
  // One equipment listing per view: the tiles also decide whether the EQUIPMENT tab exists.
  const equipment = await getEquipmentTiles(identity.id);
  const sections = await projectSections(slug, equipment);
  if (!sections) return lockedPageOrNotFound({ projectSlug: slug });
  const { project, navigation } = sections;
  const filed = equipment.filter(item => !item.classification).length;
  return <Directory path={`SYS:/PROJECTS/${project.slug.toUpperCase()}/EQUIPMENT/`} title="EQUIPMENT">
    <CurrentTabIntoView className="equipment-tabs" label="Project sections">
      <span className="equipment-tabs-project">PROJECT: <b>{project.title}</b></span>
      {navigation.map(item => <Link key={item.href} href={item.href} prefetch={false} aria-current={item.label === 'EQUIPMENT' ? 'page' : undefined}>{item.label}</Link>)}
    </CurrentTabIntoView>
    <div className="equipment-directory-head">
      <p className="lede">{filed} record{filed === 1 ? '' : 's'} filed · pick one to open its schematic and specs</p>
      <p className="equipment-sync" aria-hidden="true">ALL SCHEMATICS IN STEP<br /><span>ROTATION <SpinAngle />° · LOOP START: RIGHT SIDE</span></p>
    </div>
    {equipment.length ? <div className="equipment-tiles">
      {equipment.map(item => {
        if (item.classification) return <ClassifiedPlaceholder key={item.slug} classification={item.classification} label={item.safeLabel} />;
        const art = item.images.find(image => !image.classification);
        // prefetch off: the switch fetches the route in full when a card is clicked; the cards stay cheap until then.
        return <Link key={item.slug} className="equipment-tile" href={`/projects/${project.slug}/equipment/${item.slug}`} prefetch={false}>
          <span className="equipment-tile-view">
            {item.spin
              ? <SchematicSpinner decorative src={item.spin.src} poster={item.spin.poster} label={`${item.name} schematic`}
                  fallback={art ? <img className="equipment-tile-art" src={art.thumbnailSrc ?? art.src} alt="" loading="lazy" /> : undefined} />
              : art
                ? <img className="equipment-tile-art" src={art.thumbnailSrc ?? art.src} alt="" loading="lazy" />
                : <span className="equipment-tile-none" aria-hidden="true">NO SCHEMATIC</span>}
          </span>
          <span className="equipment-tile-copy">
            <span className="equipment-tile-file">{item.name.replace(/\s+/g, '_')}.EQP</span>
            <span className="equipment-tile-name">{item.name}</span>
            <span className="equipment-tile-meta"><span>{item.category ? `${item.category} · ` : ''}UPDATED {item.updated}</span><span className="equipment-tile-open" aria-hidden="true">OPEN ▸</span></span>
          </span>
        </Link>;
      })}
    </div> : <p>No equipment records filed yet.</p>}
  </Directory>;
}
