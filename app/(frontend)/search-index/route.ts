import { getSearchIndex } from '@/lib/content/search';

// The command palette's records (design canvas board 7; batch 23), modelled on /boot-status. The palette fetches it
// the first time it is opened on a page, so ordinary page loads make no search query. Public records only
// (lib/content/search-entries.ts); still read with this visitor's own access and never cached, so no shared cache can
// hold a response built for one visitor. robots.txt disallows it.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return Response.json({ records: await getSearchIndex() }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    // 23b: logged for the server's own log; only the error's name and message (no request data, no credentials).
    console.error('search-index: building the index failed:', error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error');
    return Response.json({ records: [], error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
