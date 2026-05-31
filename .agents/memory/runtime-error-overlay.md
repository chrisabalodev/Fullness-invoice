---
name: Runtime error overlay & benign aborts
description: Why @replit/vite-plugin-runtime-error-modal shows benign "signal is aborted" errors and how to suppress them.
---

# Replit runtime-error overlay catches benign AbortErrors

`@replit/vite-plugin-runtime-error-modal` (used in Vite artifacts, e.g. `artifacts/gestion-commerciale/vite.config.ts`) injects a client script that hooks global `window` `error` and `unhandledrejection` listeners with **no client-side filtering**. Any thrown error/rejection — including benign ones — pops a full-screen overlay that intercepts pointer events.

A common benign source is TanStack Query cancelling in-flight requests on unmount/navigation, which aborts the fetch signal and surfaces `DOMException: "signal is aborted without reason"`. This is expected dev behavior, not a real bug.

**Symptom that misleads:** the overlay covering the screen makes form inputs appear "not editable / not clickable" — the inputs are fine, the overlay is just on top of them. Same root cause as the visible error overlay.

**Why:** the plugin only serializes `{message, stack}` client-side (the original `AbortError` name is lost), and the server only suppresses when `error.stack` is falsy — abort errors have a (whitespace) stack so they pass through.

**How to apply:** use the plugin's supported server-side `filter` option in `vite.config.ts` — `runtimeErrorOverlay({ filter: (error) => !/signal is aborted|aborted without reason|the operation was aborted|the user aborted a request/i.test(error?.message ?? "") })`. `filter` returning `false` suppresses the overlay. Changing `vite.config.ts` requires a workflow restart to take effect. Do NOT just set `server.hmr.overlay = false` — that hides all errors. Do NOT only restart the workflow — that clears stale HMR state but the abort recurs.
