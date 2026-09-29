import { Directory } from '@/components/Directory';
import { PatreonActions } from '@/components/PatreonAccess';
import { patreonConfig, patreonJoinURL } from '@/lib/patreon/server';
import { viewerAccess } from '@/lib/patreon/viewer';

export const metadata = { title: 'Patreon access' };
const messages: Record<string, string> = {
  unavailable: 'PATREON SIGN-IN IS NOT CONFIGURED. PUBLIC CONTENT IS STILL AVAILABLE.',
  'invalid-state': 'THIS SIGN-IN REQUEST EXPIRED OR COULD NOT BE VERIFIED. PLEASE TRY AGAIN.',
  cancelled: 'PATREON SIGN-IN WAS CANCELLED.',
  'verification-failed': 'PATREON COULD NOT BE VERIFIED. PLEASE TRY AGAIN.',
  'signed-out': 'SIGNED OUT OF STUDIO MIGRAINZ.',
};

export default async function PatreonPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const viewer = await viewerAccess();
  const { status } = await searchParams;
  const message = typeof status === 'string' && Object.hasOwn(messages, status) ? messages[status] : undefined;
  return <Directory path="SYS:/PATREON/" title="PATREON ACCESS">
    {message && <p role="status">{message}</p>}
    <p className="status-chip">{viewer.verification === 'unavailable' ? 'VERIFICATION UNAVAILABLE / CONTENT LOCKED' : viewer.activePatron ? 'STUDIO PATRON / CLEARANCE VERIFIED' : viewer.signedIn ? 'PATREON ID VERIFIED — CLEARANCE INSUFFICIENT' : 'NO PATREON ACCOUNT CONNECTED'}</p>
    <p className="lede">Connect Patreon to access studio material included in your current membership. Some records require a specific tier.</p>
    <PatreonActions enabled={Boolean(patreonConfig())} joinURL={patreonJoinURL()} signedIn={viewer.signedIn} />
    <p>REDACTED records remain censored. HIDDEN records remain unavailable.</p>
  </Directory>;
}
