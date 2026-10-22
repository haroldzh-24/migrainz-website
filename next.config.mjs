import { withPayload } from '@payloadcms/next/withPayload';

// DEV_ALLOWED_ORIGINS (comma separated hosts) lets scripts/serve-fixture.mjs open the dev server from a phone.
const allowedDevOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').filter(Boolean);

export default withPayload(allowedDevOrigins?.length ? { allowedDevOrigins } : {});
