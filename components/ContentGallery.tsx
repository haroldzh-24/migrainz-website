import type { ComicPage } from '@/lib/content/types';

export default function ContentGallery({ images }: { images: ComicPage[] }) {
  if (!images.length) return null;
  return <div className="content-gallery">{images.map((image, index) => (
    <figure key={`${image.src}-${index}`}>
      {/\.pdf(?:\?|$)/i.test(image.src)
        ? <a className="terminal-button" href={image.src}>{image.caption || image.alt} / OPEN FILE</a>
        : <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />}
      {image.caption && <figcaption>{image.caption}</figcaption>}
    </figure>
  ))}</div>;
}
