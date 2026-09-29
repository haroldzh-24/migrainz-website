# Patreon access and announcement dragging

Implementation reference: [Patreon API v2 documentation](https://docs.patreon.com/).
No Patreon credentials or real studio URL were supplied during implementation.
Only TypeScript validation was run; live OAuth, database migrations and browser
behavior still require the manual checks below.

## Configuration

Set these server environment variables on the deployment that serves the site:

| Variable | Value to supply |
| --- | --- |
| `PATREON_CLIENT_ID` | Your registered API v2 application's client ID |
| `PATREON_CLIENT_SECRET` | That application's secret; never a public/Next public variable |
| `PATREON_REDIRECT_URI` | Exact registered absolute callback URL ending `/auth/patreon/callback` |
| `PATREON_CAMPAIGN_ID` | The numeric ID of the Studio Migrainz campaign |
| `PATREON_URL` | The actual HTTPS Studio Migrainz Patreon page URL |

The first four variables enable sign-in. Missing/invalid values leave sign-in
unavailable and PATRON content locked; they do not make production fail to boot.
`PATREON_URL` enables BECOME A PATRON independently. No fake destination is used.
The existing `PAYLOAD_SECRET` derives the session encryption key; keep it secret
and stable. Rotating it invalidates Patreon sessions as well as existing CMS uses.
The current CMS database/media environment variables are unchanged.

## OAuth and sessions

- `GET /auth/patreon/start` creates a random, ten-minute OAuth state challenge in
  a separate encrypted HttpOnly cookie, then redirects to
  `https://www.patreon.com/oauth2/authorize` with `identity identity.memberships`.
- `GET /auth/patreon/callback` verifies state, exchanges the one-use code at
  `https://www.patreon.com/api/oauth2/token`, and verifies the identity using
  `/api/oauth2/v2/identity`. All Patreon requests run on the server, use an app
  User-Agent, have timeouts and disable caching. Raw provider errors are not
  returned to the browser or logged with tokens.
- A session is AES-256-GCM encrypted/authenticated, HttpOnly, SameSite=Lax,
  path `/`, and Secure with a `__Host-` name in production. It holds the token,
  verified user ID, campaign ID and expiry. It grants no cached membership claim.
- Sessions last at most eight hours and never longer than the access token.
  Refresh tokens are deliberately discarded; reconnect when the session expires.
  There is no session database, browser-readable token, localStorage token or
  client-provided membership flag.
- `POST /auth/patreon/signout` requires a matching Origin, clears both cookies,
  and performs a full navigation. GET cannot sign users out. Sign-out disconnects
  this browser from Studio Migrainz, not the user's Patreon account itself.
- `viewerAccess()` returns only signed-in status, verified user/member IDs,
  active patron status, entitled tier IDs and verification availability. Public
  Payload queries forward only the encrypted Patreon cookie, never CMS staff
  credentials. Request-local memoization avoids duplicate membership calls inside
  one request; there is no cross-request entitlement cache.

Membership must belong to `PATREON_CAMPAIGN_ID`, be `active_patron`, have a `Paid`
last charge and a positive currently-entitled amount. This intentionally
conservative policy rejects former, declined, free, refunded and pending members.
Custom-amount paid patrons can access records without tier restrictions. Tier
restrictions match IDs from `currently_entitled_tiers`, never display names.
API outages, missing entitlement data and rate limits fail closed while leaving
public content usable. An already verified account is shown as signed in even
when membership verification is temporarily unavailable.

## CMS and migrations

Existing PUBLIC / REDACTED / PATRON / HIDDEN and listing visibility fields are
reused. Add optional `patreonTierIDs` to the shared publishing fields:

- Null or an empty JSON array means any active paid studio patron.
- Otherwise at least one numeric tier ID string in the array must match.
- Each parent, record and Media item applies its own requirements. Child content
  does not bypass a locked parent. HIDDEN/draft records remain inaccessible;
  REDACTED stays green-censored even for entitled patrons.
- `listingSummary` is explicitly public. Use it only for a safe label/teaser,
  never protected titles, writing or URLs.

`20260928_190000_patreon_tier_access` adds nullable JSONB fields to eleven live
content tables and their version tables (22 columns). Payload's snake-case
conversion names them `patreon_tier_i_ds` and `version_patreon_tier_i_ds`.
It performs no backfill, destructive update or storage operation. Its down is a
no-op so rolling code back cannot silently erase tier requirements.
The earlier `20260928_180000_classified_access` enum migration must also be present.
Neither migration was applied during this task. SQLite development uses the
existing development schema synchronization; production requires reviewed
PostgreSQL migrations before running code that selects these new columns.

Admin authentication remains entirely separate. Patreon users cannot administer,
write, publish or read historical versions of CMS records.

## Public presentation

Unauthenticated/non-entitled PATRON entries retain safe listing positions. They
show generic black text bars or a dark media block with a thick green outline,
large X, CLASSIFIED and ACCESS DENIED. No real image is rendered underneath and
the bar lengths do not correspond to secret text. Activation opens ACCESS DENIED
using the existing WindowManager/RetroWindow, with sign-in, join and close actions.
Signed-in accounts without entitlement are identified accurately.

Known patron page routes render the normal shell and safe label plus generic
text/media placeholders. Hidden, unpublished, redacted and nonexistent routes
retain not-found behavior. Children of inaccessible parents are not enumerated
in listings; a known patron child URL can still show a safe locked shell.
Entitled visitors receive real records and existing viewer/reader behavior.

REDACTED remains inert with green bars. The gray window manager, SYSTEM monitor,
viewer canvas and comic reader are not rebuilt. To avoid restoring previously
entitled descriptions from the viewer's existing sessionStorage, saved artwork
tabs are cleared when account/clearance changes are observed on a full page load.
Normal same-account tab persistence is retained.

## Media security and limitations

Media authorization checks both the file's access/tier requirements and a
reference from an accessible content record. Payload's installed file handler
checks this rule before reading local files, for originals and all image sizes.
The existing original-image restriction still reserves originals for CMS staff;
patrons receive eligible derivatives. PDFs use the same authorized file endpoint.
API/file responses are private/no-store and vary by Cookie. No S3/R2 adapter,
public bucket, signed storage URL, storage prefix or storage migration is added.

Keep `CMS_MEDIA_DIR` private and outside `public/`. Serving that directory through
a separate static server/CDN or copying files into public assets bypasses these
checks. Media marked PUBLIC and also referenced by PUBLIC content remains public,
even if another patron record uses it: classify the Media itself as PATRON when
the file must remain restricted. The existing Vercel `/tmp` directory is ephemeral
and not shared between instances; authorization does not solve missing files or
durability. Existing delivered/downloaded content cannot be recalled. A tab that
already received content may retain it until navigation/reload; fresh server/file
requests always recheck membership. Separate image requests each contact Patreon,
so rate limiting can temporarily deny protected images rather than grant access.
Encrypted-cookie sessions have no individual server-side revocation list; a
copied cookie remains usable until expiry while Patreon still validates its token.

## Exact manual setup and checks

1. Register an **API v2** OAuth client through Patreon's Clients & API Keys page
   linked in the official reference. Register the exact callback:
   `https://YOUR-ACTUAL-SITE/auth/patreon/callback`. For local development register
   `http://127.0.0.1:3000/auth/patreon/callback` separately and browse that same
   origin/port. The start route refuses a different origin from its configuration.
2. Copy the real client ID/secret into server environment settings. Obtain your
   actual campaign ID from your creator API v2 campaigns response; obtain tier
   IDs from that campaign's tier resources if needed. Set the callback, campaign
   ID and actual studio page URL. Do not use a creator token as the client secret.
   Do not put any credential in a `NEXT_PUBLIC_` variable.
3. Back up the database. In a trusted shell with the intended production CMS
   environment already supplied, review pending migrations and then apply them
   using the established workflow:

   ```powershell
   node node_modules/payload/bin.js migrate:status
   node node_modules/payload/bin.js migrate
   node node_modules/payload/bin.js migrate:status
   ```

   These are **manual deployment instructions**, not commands run by Codex.
   Do not use production schema pushing, fresh/reset or development SQLite URLs.
4. Restart/redeploy with the environment settings. In `/admin`, use separate test
   records for PUBLIC, REDACTED, PATRON and HIDDEN. Publish eligible parent records
   and Media. For one PATRON record leave tier IDs blank; on another enter your
   real allowed tier IDs as a JSON array of strings. Keep listing visibility visible.
5. In a logged-out/private browser, confirm PUBLIC works, REDACTED stays green and
   inert, PATRON uses black bars/CLASSIFIED media, and HIDDEN disappears. Click a
   patron placeholder with mouse and keyboard: the gray ACCESS DENIED window
   must open, close, minimize and restore normally without opening SYSTEM.
   Paste known patron project/character/faction/equipment/chapter URLs: safe shells
   should appear. Hidden/unpublished and nonexistent URLs should be not found.
6. Sign in with an active paid studio member. Confirm unrestricted patron records
   unlock, matching tier records unlock and other tiers stay locked. Repeat with
   a non-member, unrelated-campaign member, former member and declined member;
   none should unlock content. Signed-in non-members must see ID VERIFIED, not
   a logged-out claim. Verify PUBLIC/REDACTED/HIDDEN behavior remains unchanged.
7. Copy an eligible derivative URL while entitled, then request it in a separate
   logged-out browser and after sign-out: it must be denied. Check parent and Media
   tier restrictions separately. Inspect unauthorized HTML/RSC/network responses
   for original restricted titles, writing, captions and image URLs: none should
   appear. Check that cookies are HttpOnly/Lax and Secure in production, and that
   neither tokens nor secrets are in localStorage/client scripts. Tamper with state
   or the session cookie; access must remain denied. Cancel OAuth and try an
   expired callback. Remove Patreon configuration and confirm public pages work
   with login unavailable. Check `/admin` still requires CMS credentials.
8. In a fresh announcement session, wait for startup to finish, then drag only the
   announcement title bar to every viewport edge and resize the browser. Its X
   and other controls must not initiate dragging; X, Enter and Escape must still
   dismiss it, and reload must honor the announcement ID's session dismissal.
   Check widths at/below 700px: the announcement stays stacked and does not freely
   drag. Confirm `/admin` bypasses startup and reduced-motion behavior is unchanged.

## Files for this change

- `components/StartupSequence.tsx`, `components/ClassifiedPlaceholder.tsx`,
  `components/PatreonAccess.tsx`, `components/LockedContentPage.tsx`,
  `components/PromoWindow.tsx` (Patreon footer copy only).
- `lib/patreon/{types,server,viewer}.ts`, `lib/content/{listings,queries,locked}.ts`.
- `cms/access.ts`, `cms/fields.ts`, `collections/index.ts`, `payload-types.ts`.
- `app/auth/patreon/{start,callback,signout}/route.ts`.
- `app/(frontend)/{layout.tsx,globals.css,patreon/page.tsx}`.
- `app/(frontend)/projects/[slug]/page.tsx`, its `characters/page.tsx`,
  `characters/[character]/page.tsx`, `factions/page.tsx`,
  `factions/[faction]/page.tsx`, `equipment/[equipment]/page.tsx`, and
  `app/(frontend)/comics/[project]/[chapter]/page.tsx` (locked route fallbacks).
- `app/(payload)/api/[...slug]/route.ts` (Cookie cache variation only).
- `migrations/postgres/20260928_190000_patreon_tier_access.ts`, migration index,
  `.env.example`, this document, `docs/CMS.md`, `README.md`, `features.md`, `changelog.md`.

Earlier uncommitted workspace changes are retained.
