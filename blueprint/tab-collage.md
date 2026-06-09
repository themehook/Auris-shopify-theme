# Skill: Tab Collage

## Overview

A two-column section: left column shows a list of tab items (icon + label + description), right column shows the corresponding media (image or video) for the active tab. Supports hover or click activation.

**Files:**
- `sections/tab-collage.liquid`
- `assets/section-tab-collage.css`
- `assets/section-tab-collage.js`

**Current status:** Original design only. A "Style 2" layout was built and then fully reverted. See the abandoned work section below.

---

## Original design

### Layout

Two-column grid (text left, media right) or reversed (text right, media left) based on section settings.

- Left: section heading, optional badge, list of tab items
- Right: single media slot that swaps content as tabs are activated
- Tab activation: `hover` or `click` (controlled by `data-tab-display` on the `<tab-collage>` custom element)

### Tab items

Each block renders a `<button class="tab--collage-list-item">` with:
- An icon (SVG via `{% render 'arrow-up-right' %}` or similar)
- A label (`tab--collage-item-label`)
- Active state: `is--open` class, applied via JS

### Custom element

`assets/section-tab-collage.js` defines `<tab-collage>` as a custom element. On construction it wires `mouseover` (hover mode) or `click` events to `setupEventListeners`, which:
1. Calls `pauseAllMedia()` — pauses all YouTube, Vimeo, and `<video>` elements in the section
2. Toggles `is--open` class: adds to elements matching `data-tab-index`, removes from all others

---

## Schema (original)

### Section settings (key ones)

| ID | Type | Label | Notes |
|----|------|-------|-------|
| `color_scheme` | color_scheme | Color scheme | |
| `container` | select | Page width | boxed / full |
| `tab_display` | select | Tab display | hover / click |
| `media_size` | select | Media size | large / medium / small |
| `media_position` | select | Text position | left / right |
| `rounded_image` | checkbox | Rounded corners | |

### Block type: `tab_item`

| ID | Type |
|----|------|
| `title` | text |
| `content` | richtext |
| `image` | image_picker |
| `video` | video |
| `button_label` | text |
| `button_link` | url |

---

## Abandoned: Style 2 — Feature List

### What was attempted

A new `layout_style` select setting (Style 1 / Style 2) was added. Style 2 rendered a full-width numbered row layout matching a screenshot, implemented with `.tcs2-*` CSS classes and an IIFE in `section-tab-collage.js`.

### Why it was reverted

The existing Tab Collage section structure (two-column image + content wrapper with `tab-collage` custom element) was fundamentally incompatible with the full-width single-column row layout required by the screenshot design. Multiple rounds of iteration failed to satisfy the design requirements within the existing section shell.

**Decision:** Fully reverted Tab Collage to original. The Style 2 design was rebuilt as the standalone **Interactive Feature Showcase** section instead. See `blueprint/interactive-feature-showcase.md`.

### What was removed

- `layout_style` schema setting
- `style2_eyebrow`, `style2_badge_1/2/3`, `style2_cta_label`, `style2_cta_url` settings
- `tab2_item` block type
- All `.tcs2-*` CSS rules from `section-tab-collage.css`
- Style 2 IIFE (`initTcs2` function) from `section-tab-collage.js`
- The `{%- if layout_style == 'style2' -%} … {%- else -%} … {%- endif -%}` liquid conditionals

### Important: do not re-add Style 2 to this section

Any future request to add a numbered feature list layout to Tab Collage should redirect to the standalone Interactive Feature Showcase section. The two sections serve different purposes and should remain separate.

---

## Known decisions

1. **`pauseAllMedia()` calls `document.querySelectorAll('video')`** — this pauses videos across the whole page, not just within the section. This is intentional original theme behavior; do not narrow the scope without testing.

2. **`color-{scheme} gradient`** — both classes are always required for background colors to render. Never use one without the other.

3. **`tab--collage-item-icon.button` active state** — uses `--color-button` and `--color-button-text` CSS vars for the icon button background when a tab is open, maintaining consistency with the theme's button color scheme.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-06-09 | Style 2 added and then fully reverted; section restored to original state |
