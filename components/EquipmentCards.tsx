import { DossierCards } from './Dossier';
import type { Specification } from './EquipmentSpecifications';
import type { ComicPage } from '@/lib/content/types';

type Entry = { slug: string; name: string; category: string; images: ComicPage[]; poster?: ComicPage; specifications: Specification[]; designation?: string; quantity?: number; notes?: string };

/** EQUIPMENT CARRIED on a character dossier (board 3, batch 25): one small linked card per assignment, in the
 * assignment order. The item's specifications are on its own dossier; the card shows its file name, the assignment's
 * designation and quantity, and the assignment note. */
export default function EquipmentCards({ projectSlug, equipment }: { projectSlug: string; equipment: Entry[] }) {
  return <DossierCards title="EQUIPMENT CARRIED" label="Equipment carried" cards={equipment.map((item, index) => {
    const art = item.images.find(image => !image.classification && image.src) ?? item.poster;
    return { key: `${item.slug}-${index}`, href: `/projects/${projectSlug}/equipment/${item.slug}`, name: item.name,
      line: [`${item.name.replace(/\s+/g, '_')}.EQP`, item.designation, item.quantity != null ? `×${item.quantity}` : ''].filter(Boolean).join(' · '),
      note: item.notes, image: art ? art.thumbnailSrc ?? art.src : undefined, schematic: !item.images.some(image => !image.classification && image.src) && Boolean(art) };
  })} />;
}
