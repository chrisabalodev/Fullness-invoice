# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Application — Gestion Commerciale (STE LE WATT)

French-language commercial management web app for a Togo wholesale company. All UI in French, no emojis. Currency: F CFA, TVA 18%.

### Artifacts
- `artifacts/api-server` — Express 5 + Drizzle + PostgreSQL (port 8080)
- `artifacts/gestion-commerciale` — React + Vite + wouter + TanStack Query + shadcn/ui + Recharts (web)
- `artifacts/mockup-sandbox` — design preview (unused for this app)

### Features
- **Tableau de bord** — KPIs (CA, impayés, counts), monthly revenue chart, top clients/articles, recent docs
- **Documents** — Factures, Factures proforma, Devis, Bons de livraison, Avoirs; auto-numero `FG/FP/DV/BL/AV+year` starting at 10001; tabs+filters; live totals; article picker autofill; inline client creation; editable reference; "TVA pour mémoire" mode (TVA shown but excluded from net à payer); Prix HT + Prix TTC columns; status workflow; convert devis→facture, BL→facture; print/PDF view
- **Clients** — CRUD with detail page (history of documents)
- **Articles** — CRUD with stock + pricing + detail page
- **Paramètres** — Company info, comptoir, bank accounts, TVA rate, default vendor
- **Licence / activation** — Startup landing (2 choices: "Gestion commerciale / Comptoir" and password-protected "Administration"). First launch = 30-day trial; when expired the app is fully blocked (frontend gate + server-side `licenseGuard` returning 403 on business routes) and only the key-unlock screen is reachable. Admin (initial password `fullness@`, hashed, changeable) generates license keys for a chosen duration (value + unit: minute, hour, day, month or year); redeeming a valid key extends expiry and is independent (no admin login). Print route is also blocked when expired.

### Print view (`/documents/:id/print`)
Faithful reproduction of the STE LE WATT layout (reference: `attached_assets/WhatsApp_Image_2026-04-23_at_14.25.18_1777374944854.jpeg`):
- Top: company block left, CODE128 barcode of numero center (uses `jsbarcode` on a `<canvas>`), COMPTOIR FULLNESS box, "ORIGINAL" right marker
- Black title band with N° / Échéance / Date
- DOIT client block, lines table (REF/DESIGNATION/QTE/UNITE/PRIX/R%/MONTANT)
- Totals box with NET A PAYER highlighted
- "Arrêtée la présente … à la somme de …" with French amount-in-letters
- Vendor + REF line, signature row for BL
- Auto `window.print()` on mount; A4 inline `<style>` with `@page` rules; route registered OUTSIDE `Layout`

### Backend routes (`artifacts/api-server/src/routes/`)
- `company.ts`, `clients.ts`, `articles.ts`, `documents.ts`, `dashboard.ts`, `data.ts`, `license.ts`
- `license.ts` — scrypt+timingSafeEqual password hashing; `getOrCreateLicense()` (singleton row, creates 30-day trial); public `GET /license/status` + `POST /license/redeem` (atomic, row-locked); admin (`x-admin-password` header) `verify`/`keys` list+generate/`password`; exports `licenseGuard` middleware mounted after license router, before business routers. Keys store `durationValue`+`durationUnit` (minute/hour/day/month/year); `addDuration()` does exact ms math for minute/hour/day and calendar-aware addition for month/year
- Helpers in `lib/numero.ts` (next document number) and `lib/totals.ts` (HT/remise/TVA/TTC, with `applyTva` flag)

### Frontend helpers
- `src/lib/format.ts` — money/date formatters, document type labels
- `src/lib/number-to-words.ts` — French amount-in-letters
- `src/components/` — `client-combobox`, `article-combobox`, `status-badge`, `page-header`, `empty-state`
