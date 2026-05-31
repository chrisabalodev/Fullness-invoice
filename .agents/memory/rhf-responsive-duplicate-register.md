---
name: RHF duplicate register across responsive views
description: Why uncontrolled react-hook-form inputs appear frozen/uneditable when desktop and mobile views are both in the DOM.
---

# React Hook Form: same field registered in two always-mounted responsive views

If a form renders BOTH a desktop layout and a mobile layout and toggles them with CSS only (`hidden md:block` / `md:hidden`), both layouts stay in the DOM. When each layout calls `register("samename")` on its own `<input>`, react-hook-form keeps only the **last** ref it received for that name (the mobile input, since it renders later in JSX).

**Symptom:** uncontrolled `register()` inputs in the *visible* view look frozen / "not editable" — typing does nothing visible. Controlled inputs (explicit `value` + `onChange`, or `<Controller>`) keep working because they render from the `value` prop, not the RHF ref. So you see a confusing split: e.g. only the Désignation (Controller) and Prix TTC (controlled) fields are editable while Qté / Prix HT / TVA / Référence (plain `register`) are dead.

**Why:** RHF only supports multiple elements per name for radio/checkbox; for text/number it overwrites `_f.ref`. The visible input's ref gets clobbered by the hidden one, so RHF writes values back into the hidden element.

**How to apply:** never keep two `register()`-bound copies of the same field mounted at once. Render only ONE view at a time with a JS media-query hook (`@/hooks/use-mobile` → `useIsMobile()`), e.g. `{!isMobile && <DesktopTable/>}` / `{isMobile && <MobileCards/>}`, instead of CSS `hidden`. The hook returns `false` before mount so desktop renders first by default.
