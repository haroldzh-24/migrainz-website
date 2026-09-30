# Local media recovery inventory — 2026-09-29

Read-only inspection of `C:/Users/brrrr/AppData/Local/StudioMigrainz/cms/studio.db`
and `C:/Users/brrrr/AppData/Local/StudioMigrainz/cms/media`:

| Media ID | Original filename | Local source exists? | Recorded derivative present? |
| --- | --- | --- | --- |
| 1 | 01.svg | Yes | No derivative recorded |
| 2 | 02.svg | Yes | No derivative recorded |
| 3 | 03.svg | Yes | No derivative recorded |
| 4 | 50811a1632084403b74454f1910994488.jpeg | Yes | Yes: 50811a1632084403b74454f1910994488-224x320.jpg |
| 5 | 50811a1632084403b74454f1910994488-1.jpeg | Yes | Yes: 50811a1632084403b74454f1910994488-1-224x320.jpg |
| 6 | 50811a1632084527b74454f985599204.jpeg | Yes | Yes: 50811a1632084527b74454f985599204-228x320.jpg |
| 7 | 50811a1632084621b74454f1490297884.jpeg | Yes | Yes: 50811a1632084621b74454f1490297884-228x320.jpg |

IDs 5–7 are the saved local RCB chapter pages. Their IDs/order/relationships were
not modified. Local SQLite has legacy thumbnail metadata but no preview/viewer
filename columns. Therefore this report establishes availability of these exact
eleven files only, not availability of production's differently named WebP sizes.
No file referenced in this local inventory is missing; source-only SVG records
have no recorded resized copies.

Vercel reports an existing `migrainz-media` store linked to this project with zero
objects. The project has all three supplied Blob variables in Production/Preview.
A separate read-only `vercel blob get-store` inspection confirmed its access mode
is **Private**. No store configuration or Blob contents were changed.

Production's current Media records were not downloaded: no Payload staff session
was supplied. Obtain a complete staff export from the target deployment and review
it with the default dry-run tool described in [Blob setup](../docs/BLOB-STORAGE.md).
The recovery script was created but not run. No bytes were uploaded/regenerated,
no database was written, and no missing `/tmp` bytes are claimed to be recovered.
