// Comic reader preloading (batch 28). Pure helpers, shared by components/ArtViewer.tsx and components/ComicReader.tsx and
// tested without a browser by scripts/verify-page-preload.ts.

type Source = { src?: string; viewerSrc?: string; thumbnailSrc?: string; sources?: string[] };
type Page = Source & { classification?: unknown };

/** The sources an artwork image is tried in, best first (ArtworkCanvas loads the first). */
export const artworkSources = (image: Source) =>
  image.sources ?? [...new Set([image.viewerSrc, image.src, image.thumbnailSrc].filter((src): src is string => Boolean(src)))];

/** The source the reader shows for a page, or none for a classified or missing page. */
export const pageSource = (page: Page | undefined) => (page && !page.classification && page.src ? artworkSources(page)[0] : undefined);

/**
 * What to preload around page `index`: the next page and the previous one (never more), not classified or missing pages,
 * nothing under Save-Data. `keep` also holds the page's own source, so an unfinished preload of the page now shown is
 * never cancelled by the turn onto it.
 */
export function pagePreloads(pages: Page[], index: number, saveData = false) {
  const wanted = saveData ? [] : [...new Set([pageSource(pages[index + 1]), pageSource(pages[index - 1])].filter((src): src is string => Boolean(src)))];
  const own = pageSource(pages[index]);
  return { wanted, keep: new Set(own ? [...wanted, own] : wanted) };
}
