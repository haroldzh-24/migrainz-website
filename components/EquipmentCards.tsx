import Link from 'next/link';
import EquipmentSpecifications, { type Specification } from './EquipmentSpecifications';
import type { ComicPage } from '@/lib/content/types';

type Entry = { slug: string; name: string; category: string; images: ComicPage[]; specifications: Specification[]; designation?: string; quantity?: number; notes?: string };
export default function EquipmentCards({ projectSlug, equipment }: { projectSlug: string; equipment: Entry[] }) {
  if (!equipment.length) return null;
  return <section aria-label="Character equipment"><h2>EQUIPMENT</h2><div className="equipment-cards">
    {equipment.map((item, index) => <article className="equipment-card" key={`${item.slug}-${index}`}>
      {item.images[0] && <img src={item.images[0].thumbnailSrc ?? item.images[0].src} alt={item.images[0].alt} loading="lazy" />}
      <div><h3><Link href={`/projects/${projectSlug}/equipment/${item.slug}`}>{item.designation || item.name}</Link></h3>
        {item.designation && <p>{item.name}</p>}
        {item.category && <p className="eyebrow">{item.category}</p>}
        {item.quantity != null && <p>QUANTITY: {item.quantity}</p>}
        <EquipmentSpecifications rows={item.specifications} />
        {item.notes && <p>{item.notes}</p>}
      </div>
    </article>)}
  </div></section>;
}
