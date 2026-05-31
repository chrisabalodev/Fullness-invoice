---
name: lib lib/* project-references rebuild before artifact typecheck
description: Why artifact typecheck can fail on a brand-new lib export even though the lib source is correct
---

# Adding an export to a `lib/*` package isn't visible to artifacts until libs are rebuilt

Artifacts (e.g. `artifacts/api-server`) reference `lib/*` packages via TypeScript **project references** (`references: [{ path: "../../lib/db" }]`). The artifact typechecks against the lib's **emitted declarations** (`lib/<pkg>/dist/*.d.ts`), NOT the lib `src`. Even though the package `exports` map points at `./src/index.ts` for runtime/bundling, `tsc` consumes the composite build output.

**Symptom:** after adding a new table/export to a lib (e.g. `licenseTable` in `lib/db/src/schema/`), `pnpm --filter @workspace/<artifact> run typecheck` fails with `TS2724 / TS2305: '"@workspace/db"' has no exported member '...'` — while the lib source is plainly correct.

**Fix:** rebuild lib declarations first:
- `pnpm run typecheck:libs` (runs `tsc --build`, regenerates `lib/*/dist/*.d.ts`), then run the artifact typecheck.
- The canonical `pnpm run typecheck` already builds libs before leaf packages, so it won't show this.

**Why:** composite libs cache to `.tsbuildinfo` and emit `dist` d.ts; artifacts read those, so a new src export is invisible until the lib is rebuilt.

**How to apply:** whenever you add/rename an export in any `lib/*` package and then typecheck a single artifact in isolation, run `typecheck:libs` first (or just use root `typecheck`).

Note: `@workspace/db` still needs NO dist build for *runtime* — the server is esbuild-bundled from src and DB changes only need `pnpm --filter @workspace/db run push`. The rebuild requirement is purely a `tsc` typecheck concern.
