import Link from 'next/link';
import ContentGallery from '@/components/ContentGallery';
import ContentWriting from '@/components/ContentWriting';
import type { AccessControl, ComicPage, PublicSection, Writing } from '@/lib/content/types';

type AccessProps = { state?: AccessControl['state']; displayTitle?: string | null; redactionLabel?: string | null; teaser?: string | null };

export function AccessPlaceholder({ access, kind = 'text' }: { access?: AccessProps; kind?: 'text' | 'art' | 'file' }) {
  const state = access?.state ?? 'public';
  if (state === 'hidden' || state === 'public') return null;
  const title = access?.displayTitle || (state === 'patron' ? 'CLASSIFIED / PATRON ACCESS' : access?.redactionLabel || 'REDACTED');
  return <div className={`access-placeholder access-placeholder-${state}`} role="status">
    <strong>{title}</strong>
    {state === 'redacted' && <span className="redaction-bars" aria-hidden="true"><i /><i /><i /></span>}
    {state === 'patron' && <span className="classified-stamp" aria-hidden="true">LOCKED</span>}
    {kind === 'art' && <span className="access-placeholder-kind">ARTWORK WITHHELD</span>}
    {kind === 'file' && <span className="access-placeholder-kind">FILE CLASSIFIED</span>}
    {access?.teaser && <p>{access.teaser}</p>}
  </div>;
}

function selectedMedia(media: unknown, alt?: string | null, caption?: string | null): ComicPage | undefined {
  if (!media || typeof media !== 'object') return undefined;
  const file = media as { url?: string | null; mimeType?: string | null; alt?: string | null; caption?: string | null; width?: number | null; height?: number | null;
    thumbnailURL?: string | null; sizes?: Record<string, { url?: string | null } | null> };
  const thumbnail = file.sizes?.thumbnail?.url ?? file.thumbnailURL ?? undefined;
  const preview = file.sizes?.preview?.url ?? thumbnail ?? (file.mimeType === 'application/pdf' ? file.url : undefined);
  const viewer = file.sizes?.viewer?.url ?? file.sizes?.preview?.url ?? thumbnail ?? (file.mimeType === 'application/pdf' ? file.url : undefined);
  if (!preview) return undefined;
  return { src: preview, viewerSrc: viewer ?? preview, thumbnailSrc: thumbnail ?? preview,
    alt: alt || file.alt || '', caption: caption || file.caption || undefined,
    width: file.width ?? undefined, height: file.height ?? undefined };
}

function restricted(section: PublicSection) {
  const access = section.accessControl;
  return access?.state === 'redacted' || access?.state === 'patron'
    ? <AccessPlaceholder key={section.id} access={access} kind={section.blockType === 'image' || section.blockType === 'gallery' ? 'art' : 'text'} />
    : null;
}

export function ContentSections({ sections = [] }: { sections?: PublicSection[] }) {
  if (!sections.length) return null;
  return <div className="cms-sections">
    {sections.map((section, index) => {
      const state = section.accessControl?.state ?? 'public';
      if (state === 'hidden' || (state !== 'public' && section.accessControl?.showInListings === false)) return null;
      if (state !== 'public') return restricted(section);
      const key = section.id || `${section.blockType}-${index}`;
      switch (section.blockType) {
        case 'heading': {
          const text = typeof section.text === 'string' ? section.text : '';
          const level = section.level === 'h3' || section.level === 'h4' ? section.level : 'h2';
          if (level === 'h3') return <h3 key={key}>{text}</h3>;
          if (level === 'h4') return <h4 key={key}>{text}</h4>;
          return <h2 key={key}>{text}</h2>;
        }
        case 'richText':
          return <ContentWriting key={key} data={section.content as Writing} />;
        case 'image': {
          const image = selectedMedia(section.media, typeof section.alt === 'string' ? section.alt : undefined, typeof section.caption === 'string' ? section.caption : undefined);
          return image ? <ContentGallery key={key} images={[image]} /> : null;
        }
        case 'gallery': {
          const rows: unknown[] = Array.isArray(section.images) ? section.images : [];
          const images = rows.flatMap(row => {
            if (!row || typeof row !== 'object') return [];
            const item = row as { media?: unknown; alt?: string | null; caption?: string | null };
            const image = selectedMedia(item.media, item.alt, item.caption);
            return image ? [image] : [];
          });
          return <section className="section-block" key={key}>
            {typeof section.title === 'string' && <h2>{section.title}</h2>}
            <ContentGallery images={images} />
          </section>;
        }
        case 'desktopFiles': {
          const files: unknown[] = Array.isArray(section.files) ? section.files : [];
          return <section className="section-block" key={key}>
            {typeof section.title === 'string' && <h2>{section.title}</h2>}
            <div className="directory-list">{files.map((entry, fileIndex) => {
              if (!entry || typeof entry !== 'object') return null;
              const file = entry as { id?: string; label?: string; href?: string };
              return <div className="directory-row" key={file.id || fileIndex}>
                <span>FILE</span>{file.href ? <Link href={file.href}>{file.label || 'OPEN FILE'}</Link> : <strong>{file.label || 'FILE'}</strong>}
              </div>;
            })}</div>
          </section>;
        }
        case 'metadata': {
          const items: unknown[] = Array.isArray(section.items) ? section.items : [];
          return <section className="section-block" key={key}>
            {typeof section.title === 'string' && <h2>{section.title}</h2>}
            <dl className="cms-metadata">{items.map((entry, itemIndex) => {
              if (!entry || typeof entry !== 'object') return null;
              const item = entry as { id?: string; label?: string; value?: string };
              return <div key={item.id || itemIndex}><dt>{item.label}</dt><dd>{item.value}</dd></div>;
            })}</dl>
          </section>;
        }
        case 'log':
          return <article className="production-note" key={key}>
            {typeof section.date === 'string' && <time dateTime={section.date}>{section.date.slice(0, 10)}</time>}
            {typeof section.title === 'string' && <h3>{section.title}</h3>}
            <ContentWriting data={section.content as Writing} />
          </article>;
        case 'divider':
          return <hr className={`cms-divider cms-divider-${section.space === 'small' || section.space === 'large' ? section.space : 'normal'}`} key={key} />;
        case 'quote':
          return <blockquote className="cms-callout" key={key}>
            {typeof section.quote === 'string' && <p>{section.quote}</p>}
            {typeof section.attribution === 'string' && <cite>{section.attribution}</cite>}
          </blockquote>;
        default:
          return null;
      }
    })}
  </div>;
}
