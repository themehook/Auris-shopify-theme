# Skill: Scroll Reveal Media

## Overview

A two-stage sticky scroll section. Stage 1 shows text content that scrolls normally. Stage 2 reveals a sticky media column (image or video) alongside scrolling content blocks. Blocks animate in as the user scrolls.

**Files:**
- `sections/scroll-reveal-media.liquid`
- `assets/scroll-reveal-media.css`
- `assets/scroll-reveal-media.js`

---

## Requirements (from client)

### Placeholder images
- Replace old placeholder images with Shopify-style colored gradient backgrounds + white SVG icon overlay
- Each slot (1–4) uses a distinct warm/neutral gradient color
- White semi-transparent SVG overlay (`fill: rgba(255, 255, 255, 0.45)`)
- Keep all animation and behavior unchanged

### Stage 2 enhancements
- Add `stage2_color_scheme` color scheme picker for the Stage 2 media column background
- Add `button_style` selector (primary / secondary / outline / link)
- Add `button_size` selector (small / medium / large / extra-large)
- Add `header_offset` range setting (default 80px) for sticky top offset to account for fixed headers

---

## Schema additions

| ID | Type | Label | Default | Notes |
|----|------|-------|---------|-------|
| `stage2_color_scheme` | color_scheme | Stage 2 color scheme | background-1 | Applied to stage 2 sticky media wrapper |
| `button_style` | select | Button style | button | Options: button, button--secondary, button--tertiary, link |
| `button_size` | select | Button size | — | Options: sm, md, lg, xl |
| `header_offset` | range (0–200, step 4) | Sticky top offset (px) | 80 | Accounts for fixed header height |

---

## Sticky positioning

Stage 2 sticky panel uses inline style set from the `header_offset` setting:

```liquid
style="top: {{ section.settings.header_offset | default: 80 }}px;
       height: calc(100vh - {{ section.settings.header_offset | default: 80 }}px);"
```

This ensures the sticky panel sits below the fixed site header and fills the remaining viewport height.

---

## Placeholder image technique

Each media slot that has no image assigned receives a colored gradient background and a white SVG product icon overlay.

### CSS pattern (one entry per slot):

```css
.srm-img--1.srm-img--no-image {
  background: linear-gradient(145deg, #d4c5b2 0%, #b8a898 100%);
}
.srm-img--2.srm-img--no-image {
  background: linear-gradient(145deg, #c2b5a8 0%, #a89080 100%);
}
/* etc. for slots 3 and 4 */
```

### SVG overlay:

```css
.srm-img--no-image .placeholder-svg {
  fill: rgba(255, 255, 255, 0.45) !important;
  stroke: none !important;
}
```

### Liquid: slot-based placeholder name

```liquid
{%- assign placeholder_name = 'product-' | append: slot -%}
{{ placeholder_name | placeholder_svg_tag: 'srm-placeholder-svg placeholder-svg' }}
```

The `assign` line is required — removing it breaks the placeholder rendering.

---

## Video overlay condition

The `srm-video-overlay` element only renders when a video or image is actually present:

```liquid
{%- if block.settings.video != blank or block.settings.image != blank -%}
  <div class="srm-video-overlay"></div>
{%- endif -%}
```

---

## Known decisions

1. **`header_offset` default = 80** — covers a typical fixed header. Merchants should adjust this to match their header height exactly.
2. **Gradient colors per slot** — warm/neutral tones (#d4c5b2 through #8a7060) chosen to match the Luno brand palette, distinct enough to tell slots apart in the editor.
3. **`placeholder_svg_tag` filter** — Shopify built-in filter. The slot integer (1–4) is appended to `'product-'` to cycle through Shopify's numbered product placeholder SVGs.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-06-09 | Placeholder image gradient backgrounds + white SVG overlays added; stage2_color_scheme, button_style, button_size, header_offset settings added |
