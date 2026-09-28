# Parked access/sections work

These `.txt` files are exact copies of the six relevant working-tree source files
before the 2026-09-28 infrastructure stabilization. They preserve the unfinished
schema, hooks, adapters and renderer, including earlier audit repairs. They are
not imported, compiled or registered with Payload.

Active collections use the established `_status`, `accessLevel`,
`listingVisibility` and `listingSummary` fields. The unfinished `accessControl`
and `sections` fields/hooks are disconnected. Public queries emit public
compatibility metadata only after Payload's anonymous access checks, and always
return empty sections. The existing frontend components are left in place.

No SQL removes experimental columns or records. If those fields were saved in a
development database, preserve that database and do not approve schema-push
prompts that delete them. Back it up before starting development. Production
PostgreSQL schema pushing remains disabled. Re-enabling this work requires a
separate access-model review, data migration and media-reference integration;
there is intentionally no environment switch to enable it in production.
