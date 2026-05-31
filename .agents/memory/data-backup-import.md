---
name: Data backup / import / reset (Drizzle + Postgres)
description: Gotchas when exporting/importing full-table JSON backups that preserve serial ids.
---

# Full-data backup / import / reset

The Paramètres page exposes export (JSON download), import (replace all data),
and reset (wipe transactional data, keep company). Backend lives in
`artifacts/api-server/src/routes/data.ts`.

## Durable lessons

- **Revive timestamps before insert.** Drizzle `timestamp(...)` columns expect a
  JS `Date` on insert, but a JSON round-trip turns them into ISO strings. Inserting
  the string throws (`value.toISOString is not a function`). Convert known
  timestamp fields back to `new Date(...)` before insert. `date(...)` columns use
  string mode by default and need no conversion.
  **How to apply:** company → `updatedAt`; clients/articles/documents/reglements →
  `createdAt`; document_lines has none.

- **Sequence realignment must use setval's 3-arg form.** After inserting rows with
  explicit serial ids (or after a wipe), realign with
  `setval(seq, COALESCE(MAX(id),1), MAX(id) IS NOT NULL)`. The two-arg form
  defaults `is_called=true`, so an emptied table restarts at **2**, not 1.
  **Why:** caught by review — reset then "new client" gave id 2.

- **Guard destructive import before deleting.** Validate `version` and require a
  non-empty `company` array *before* the transaction. An array-shaped but empty
  payload would otherwise wipe company settings. Bad row shapes are already safe
  (FK/NOT NULL violations roll back the whole transaction), so deep per-field
  validation isn't required — the atomic transaction is the real safety net.

- **Admin ops use raw `fetch("/api/...")`,** not the Orval-generated client —
  matching the existing `test-smtp` precedent. Bulk/file ops map poorly to codegen.
  `zod` is not a direct dep of api-server, so validate inline by hand.
