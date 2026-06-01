---
name: canvas/JsBarcode effect must depend on ALL queries gating the canvas mount
description: Intermittent missing barcode/canvas drawing when the canvas only renders after multiple async queries resolve
---

# An effect drawing into a <canvas> must depend on every async value that gates the canvas mount

In the document print view, the barcode `<canvas>` is only rendered after BOTH `useGetDocument` and `useGetCompany` resolve (the component returns "Chargement…" until both are present). The `JsBarcode` draw ran in a `useLayoutEffect` keyed only on `[doc]`.

**Symptom:** barcode missing *intermittently*. When `company` resolved AFTER `doc`, the canvas mounted on the company-triggered re-render, but the effect (deps `[doc]`, unchanged) never re-ran, so it never drew. When `company` resolved first, it worked — hence flaky.

**Fix:** include every query the canvas mount depends on in the effect deps (`[doc, company]`) and guard with `if (doc && company && ref.current)`.

**Why:** `useLayoutEffect` only re-runs when a listed dep changes. If the canvas's existence depends on value B but the effect only lists value A, a B-only update mounts the canvas without re-running the draw.

**How to apply:** any imperative draw/measure into a ref'd DOM node that is conditionally rendered behind N async values must list all N in the effect deps (or split the loading gate so the node always exists).
