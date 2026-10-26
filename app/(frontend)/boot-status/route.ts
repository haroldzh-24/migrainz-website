import { viewerAccess } from '@/lib/patreon/viewer';
import { bootClearance, getBootStatus } from '@/lib/content/boot';

// Boot checklist data for this visitor. StartupSequence fetches it only when the checklist is about to show (once per
// session), so ordinary page loads make no boot query. Per visitor and never cached: the lines depend on access.
export const dynamic = 'force-dynamic';

export async function GET() {
  const [viewer, lines] = await Promise.all([viewerAccess(), getBootStatus()]);
  return Response.json({ lines: [...lines, bootClearance(viewer)] }, { headers: { 'Cache-Control': 'private, no-store' } });
}
