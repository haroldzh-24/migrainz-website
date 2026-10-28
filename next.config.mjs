import { withPayload } from '@payloadcms/next/withPayload';
import { securityHeaders } from './security-headers.mjs';

// DEV_ALLOWED_ORIGINS (comma separated hosts) lets scripts/serve-fixture.mjs open the dev server from a phone.
const allowedDevOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').filter(Boolean);

// Next 16.4 stops the first agent-run `next dev` / `next build` after an advisory lands and asks for
// `next upgrade --agent`. That would break check runs and the review server; dependency upgrades here go
// through a reviewed branch instead (npm audit tracks advisories). People in a terminal see no difference.
const experimental = { agentUpgrade: false };

// Security headers (roadmap M3): see security-headers.mjs. poweredByHeader: false also stops withPayload's
// "X-Powered-By: Next.js, Payload".
const config = {
  experimental,
  poweredByHeader: false,
  headers: async () => securityHeaders({ dev: process.env.NODE_ENV === 'development' }),
  ...(allowedDevOrigins?.length ? { allowedDevOrigins } : {}),
};

export default withPayload(config);
