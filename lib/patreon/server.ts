// Node-only; shared by Next route handlers and Payload's server/CLI configuration.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { anonymousAccess, type ViewerAccess } from './types';

export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-migrainz-patreon' : 'migrainz-patreon';
export const stateCookie = process.env.NODE_ENV === 'production' ? '__Host-migrainz-patreon-state' : 'migrainz-patreon-state';
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', Vary: 'Cookie' };
const userAgent = 'Studio Migrainz - Website';

export function patreonConfig() {
  const clientID = process.env.PATREON_CLIENT_ID;
  const clientSecret = process.env.PATREON_CLIENT_SECRET;
  const redirectURI = process.env.PATREON_REDIRECT_URI;
  const campaignID = process.env.PATREON_CAMPAIGN_ID;
  if (!clientID || !clientSecret || !redirectURI || !campaignID || !/^\d+$/.test(campaignID) || (process.env.PAYLOAD_SECRET?.length ?? 0) < 32) return undefined;
  try {
    const url = new URL(redirectURI);
    const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
    if ((!local && url.protocol !== 'https:') || url.pathname !== '/auth/patreon/callback' || url.search || url.hash || url.username || url.password) return undefined;
    return { clientID, clientSecret, redirectURI, campaignID, origin: url.origin };
  } catch { return undefined; }
}

export function patreonJoinURL() {
  try {
    const url = new URL(process.env.PATREON_URL || '');
    return url.protocol === 'https:' && ['patreon.com', 'www.patreon.com'].includes(url.hostname) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

function key(purpose: string) {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret || secret.length < 32) throw new Error('Patreon session encryption unavailable');
  return createHash('sha256').update(`studio-migrainz:patreon:${purpose}:v1\0${secret}`).digest();
}

export function seal(value: object, purpose: 'session' | 'state') {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(purpose), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const result = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  if (result.length > 3800) throw new Error('Patreon session exceeds cookie limit');
  return result;
}

export function unseal(value: string | undefined, purpose: 'session' | 'state'): Record<string, unknown> | undefined {
  try {
    if (!value || value.length > 3800) return undefined;
    const data = Buffer.from(value, 'base64url');
    if (data.length < 29) return undefined;
    const decipher = createDecipheriv('aes-256-gcm', key(purpose), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'));
    if (!result || typeof result !== 'object' || typeof result.exp !== 'number' || result.exp <= Date.now()) return undefined;
    return result;
  } catch { return undefined; }
}

export function cookieValue(headers: Headers, name: string) {
  return headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

type Resource = {
  id?: string; type?: string; attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: Resource | Resource[] | null }>;
};
class PatreonAPIError extends Error { constructor(public status: number) { super('Patreon verification failed'); } }

export async function verifyIdentity(accessToken: string, campaignID: string): Promise<ViewerAccess> {
  const url = new URL('https://www.patreon.com/api/oauth2/v2/identity');
  url.searchParams.set('include', 'memberships.campaign,memberships.currently_entitled_tiers');
  url.searchParams.set('fields[member]', 'patron_status,last_charge_status,currently_entitled_amount_cents');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': userAgent }, cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new PatreonAPIError(response.status);
  const body = await response.json() as { data?: Resource; included?: Resource[] };
  if (body.data?.type !== 'user' || typeof body.data.id !== 'string') throw new Error('Invalid Patreon identity');
  const memberships = body.data.relationships?.memberships?.data;
  if (!Array.isArray(memberships)) return { signedIn: true, userID: body.data.id, activePatron: false, tierIDs: [], verification: 'unavailable' };
  const ids = new Set(memberships.filter(item => item.type === 'member').map(item => item.id));
  const member = (body.included ?? []).find(item => {
    const campaign = item.relationships?.campaign?.data;
    return item.type === 'member' && ids.has(item.id) && campaign && !Array.isArray(campaign) && campaign.type === 'campaign' && campaign.id === campaignID;
  });
  const attributes = member?.attributes;
  // Conservative paid-membership policy. Former, declined, free, pending and
  // refunded memberships do not unlock content, even if a tier is still listed.
  const activePatron = attributes?.patron_status === 'active_patron' && attributes.last_charge_status === 'Paid'
    && typeof attributes.currently_entitled_amount_cents === 'number' && attributes.currently_entitled_amount_cents > 0;
  const tiers = member?.relationships?.currently_entitled_tiers?.data;
  return { signedIn: true, userID: body.data.id, memberID: member?.id, activePatron,
    tierIDs: activePatron && Array.isArray(tiers) ? tiers.flatMap(tier => tier.type === 'tier' && typeof tier.id === 'string' ? [tier.id] : []) : [], verification: 'verified' };
}

export async function exchangeCode(code: string, config: NonNullable<ReturnType<typeof patreonConfig>>) {
  const response = await fetch('https://www.patreon.com/api/oauth2/token', {
    method: 'POST', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': userAgent },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: config.clientID, client_secret: config.clientSecret, redirect_uri: config.redirectURI }),
  });
  if (!response.ok) throw new Error('Patreon token exchange failed');
  const token = await response.json() as { access_token?: unknown; expires_in?: unknown };
  if (typeof token.access_token !== 'string' || !token.access_token || typeof token.expires_in !== 'number' || token.expires_in <= 0) throw new Error('Invalid Patreon token');
  // Deliberately do not retain refresh tokens. Reconnect after at most eight hours.
  return { accessToken: token.access_token, maxAge: Math.min(8 * 60 * 60, Math.floor(token.expires_in)) };
}

const requestAccess = new WeakMap<Headers, Promise<ViewerAccess>>();
export function viewerAccessFromHeaders(headers: Headers): Promise<ViewerAccess> {
  let result = requestAccess.get(headers);
  if (!result) { result = resolveViewer(headers); requestAccess.set(headers, result); }
  return result;
}
async function resolveViewer(headers: Headers): Promise<ViewerAccess> {
  const config = patreonConfig();
  if (!config) return anonymousAccess;
  const session = unseal(cookieValue(headers, sessionCookie), 'session');
  if (!session || typeof session.accessToken !== 'string' || typeof session.userID !== 'string' || session.campaignID !== config.campaignID) return anonymousAccess;
  try {
    const viewer = await verifyIdentity(session.accessToken, config.campaignID);
    return viewer.userID === session.userID ? viewer : anonymousAccess;
  } catch (error) {
    if (error instanceof PatreonAPIError && error.status === 401) return anonymousAccess;
    return { signedIn: true, userID: session.userID, activePatron: false, tierIDs: [], verification: 'unavailable' };
  }
}
