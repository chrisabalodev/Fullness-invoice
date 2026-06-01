---
name: drizzle-kit push prompts on column rename/drop even with --force
description: Why `pnpm --filter @workspace/db run push`/`push-force` hangs in non-tty bash, and the workaround
---

# drizzle-kit push hangs on ambiguous column changes (even with --force)

When a schema change drops a column and adds new ones (e.g. replacing `months` with `duration_value`+`duration_unit`), `drizzle-kit push` (and `push-force`) prints an interactive prompt:

```
Is duration_value column in license_keys table created or renamed from another column?
❯ + duration_value          create column
  ~ months › duration_value rename column
```

`--force` does NOT skip this rename/create disambiguation — it only auto-confirms data-loss warnings. In the non-interactive bash tool the command blocks forever.

**Workaround (dev, when the affected table is empty or test-only data):** apply the DDL directly with `psql "$DATABASE_URL" -c "ALTER TABLE ..."` so the live DB matches the Drizzle schema, then push becomes a no-op. NOT-NULL columns can be added without a default when the table has 0 rows (or add a default, then `DROP DEFAULT`).

**Why:** push's rename heuristic is interactive by design; there's no flag to force "treat as create".

**How to apply:** before any `push` that renames/drops columns, check row count; if empty/disposable, hand-write the `ALTER TABLE` (and any CHECK constraints) via psql instead of fighting the prompt. CHECK constraints defined via `check()` in the schema also need the matching `ALTER TABLE ADD CONSTRAINT` when bypassing push.
