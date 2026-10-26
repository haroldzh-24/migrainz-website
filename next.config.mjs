import { withPayload } from '@payloadcms/next/withPayload';

// DEV_ALLOWED_ORIGINS (comma separated hosts) lets scripts/serve-fixture.mjs open the dev server from a phone.
const allowedDevOrigins = process.env.DEV_ALLOWED_ORIGINS?.split(',').filter(Boolean);

// Next 16.4 stops the first agent-run `next dev` / `next build` after an advisory lands and asks for
// `next upgrade --agent`. That would break check runs and the review server; dependency upgrades here go
// through a reviewed branch instead (npm audit tracks advisories). People in a terminal see no difference.
const experimental = { agentUpgrade: false };

export default withPayload(allowedDevOrigins?.length ? { allowedDevOrigins, experimental } : { experimental });
