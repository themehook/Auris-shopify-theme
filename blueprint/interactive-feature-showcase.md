# Skill: Interactive Feature Showcase

## Overview

A standalone dark-background section that displays a list of collection-linked feature rows in a numbered, full-width layout. Designed to replace an attempt at embedding a "Style 2" inside the Tab Collage section, which was ultimately reverted. This is a purpose-built, independent section.

**Section name in theme editor:** Interactive feature tab
**Files:**
- `sections/interactive-feature-showcase.liquid`
- `assets/interactive-feature-showcase.css`
- `assets/interactive-feature-showcase.js`

---

## Requirements (from client)

1. Add a Section Heading at the top.
2. Display Collection/Tab Items below the heading.
3. The active collection item must be visually highlighted.
4. Each collection item must have a Collection Picker in block settings.
5. Add a right-side arrow button on each row — clicking navigates to the collection page.
6. At the bottom, include a text link/button directing users to the Collection List page.
7. Match the design, spacing, alignment, and overall visual style to the provided screenshot.
8. Clean, modern, fully responsive across all devices.

---

## Design Specification (from screenshot)

### Section layout

```
┌──────────────────────────────────────────────────────────────┐
│ [WHY LUNO]              [60H battery  ]                      │
│                         [-42dB ANC   ]                       │
│ Built different.        [5yr warranty]                       │
│ Sounds different.                                            │
├──────────────────────────────────────────────────────────────┤
│ 01  Adaptive ANC  ─────────────  -42 dB          ○→         │
│                                  Nulls the room before…      │
├──────────────────────────────────────────────────────────────┤
│▌02  60H Battery   ─────────────  All day. All night.  ●→    │
│▌                                 Then some.                  │
├──────────────────────────────────────────────────────────────┤
│ 03  Spatial Audio ─────────────  The stage is everywhere.○→  │
│                                  So are you.                 │
├──────────────────────────────────────────────────────────────┤
│ Explore the full spec sheet →                                │
└──────────────────────────────────────────────────────────────┘
```

### Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Eyebrow | 1.2rem, uppercase, 0.14em tracking | 700 | `rgba(--color-base-accent-1)` |
| Heading line 1 | `clamp(4.8rem, 7.5vw, 9.6rem)` | 700 | `rgb(--color-foreground)` full opacity |
| Heading line 2 | same | 700 | `rgba(--color-foreground, 0.38)` faded |
| Badge | 1.25rem | 400 | `rgba(--color-foreground, 0.6)` |
| Row number | 1.35rem | 400 | `rgba(--color-foreground, 0.3)` → accent on active |
| Row title | `clamp(2.2rem, 2.6vw, 3.2rem)` | 600 | foreground → accent on active |
| Stat value | 1.7rem | 600 | foreground |
| Stat description | 1.25rem | 400 | `rgba(--color-foreground, 0.35)` |
| Footer CTA | 1.5rem | 500 | `rgba(--color-base-accent-1)` |

### Active / hover state

- Thin left vertical line (`ifs-indicator`): animates `transform: scaleY(0 → 1)`, `transform-origin: top center`, accent blue color
- Row number: changes from muted to accent blue
- Row title: changes from white to accent blue
- Arrow circle: background fills with `rgb(--color-foreground)`, arrow color inverts to `rgb(--color-background)`
- Transition: 0.25s ease for color, 0.4s cubic-bezier for indicator

### Badges

- Pill shape: `border-radius: 10rem`
- Border: `0.1rem solid rgba(--color-foreground, 0.28)`
- Stacked vertically top-right on desktop
- Wrap to horizontal row on tablet/mobile

---

## Schema

### Section settings

| ID | Type | Label | Default |
|----|------|-------|---------|
| `container` | select | Page width | boxed |
| `color_scheme` | color_scheme | Color scheme | background-1 |
| `eyebrow` | text | subheading | Why our brand |
| `heading` | richtext | Heading | — |
| `badge_1` | text | Badge 1 | Feature one |
| `badge_2` | text | Badge 2 | Feature two |
| `badge_3` | text | Badge 3 | Feature three |
| `cta_label` | text | Link label | Explore the full range |
| `cta_url` | url | Link URL | — |
| `tab_display` | select | Activate items on | hover |
| `padding_top` | range (0–150, step 5) | Desktop padding top | 60 |
| `padding_bottom` | range (0–150, step 5) | Desktop padding bottom | 60 |
| `mobile_padding_top` | range (0–150, step 5) | Mobile padding top | 40 |
| `mobile_padding_bottom` | range (0–150, step 5) | Mobile padding bottom | 40 |

### Block type: `item`

| ID | Type | Label | Notes |
|----|------|-------|-------|
| `collection` | collection | Collection | Title used as row label |
| `title_override` | text | Title override | Replaces collection name when set |
| `stat_value` | text | Stat / value | e.g. "−42 dB" |
| `stat_desc` | text | Stat description | e.g. "Nulls the room before you notice." |

Max blocks: 8. Preset includes 3 empty `item` blocks.

---

## HTML structure

```html
<div class="ifs-section ifs-section--{id} color-{scheme} gradient">
  <div class="container">

    <!-- Header -->
    <div class="ifs-header">
      <div class="ifs-header-left">
        <span class="ifs-eyebrow">...</span>
        <h2 class="ifs-heading">
          <span>Line one</span>   <!-- full opacity -->
          <span>Line two</span>   <!-- 38% opacity via CSS span+span -->
        </h2>
      </div>
      <div class="ifs-badges">
        <span class="ifs-badge">60H battery</span>
        <span class="ifs-badge">-42dB ANC</span>
        <span class="ifs-badge">5yr warranty</span>
      </div>
    </div>

    <!-- Feature rows -->
    <div class="ifs-list" data-display="hover|click">
      <div class="ifs-item is--active">
        <span class="ifs-indicator"></span>          <!-- left accent line -->
        <div class="ifs-num-wrap">
          <span class="ifs-num">01</span>
        </div>
        <span class="ifs-title">Adaptive ANC</span>
        <span class="ifs-divider"></span>             <!-- flex-grow: 1 hr -->
        <div class="ifs-stat">
          <span class="ifs-stat-value">-42 dB</span>
          <span class="ifs-stat-desc">Nulls the room before you notice.</span>
        </div>
        <a href="/collections/..." class="ifs-arrow">
          <!-- arrow-up-right snippet SVG -->
        </a>
      </div>
    </div>

    <!-- Footer CTA -->
    <div class="ifs-footer">
      <a class="ifs-footer-link" href="...">
        Explore the full spec sheet
        <!-- arrow-up-right snippet SVG -->
      </a>
    </div>

  </div>
</div>
```

---

## Two-line faded heading technique

The `heading` field is `richtext`. Shopify wraps each paragraph in `<p>` tags. The liquid template replaces all block-level tags with `<span>` tags:

```liquid
{{ section.settings.heading
  | replace: 'p>', 'span>'
  | replace: 'h1>', 'span>'
  ... }}
```

CSS makes each span a block and dims the second one:

```css
.ifs-heading span { display: block; }
.ifs-heading span + span { color: rgba(var(--color-foreground), 0.38); }
```

The merchant enters two paragraphs in the rich text editor — first line is full opacity, second is faded.

---

## JavaScript

`assets/interactive-feature-showcase.js` — plain IIFE, no dependencies.

- Reads `data-display` attribute on `.ifs-list` (`hover` or `click`)
- On mouseenter (hover) or click (click mode): removes `is--active` from all `.ifs-item` siblings, adds it to the target
- Click mode: does not activate if the click was directly on `.ifs-arrow` (allows navigation without switching active state)
- Shopify section:load event handled for live editor reloads

---

## CSS layout notes

- `.ifs-item` is `display: flex; align-items: center`
- `.ifs-indicator` is `position: absolute` on the left edge — parent has `position: relative`
- `.ifs-num-wrap` has `padding-left: 2.4rem` so content clears the 0.2rem indicator line
- `.ifs-divider` is `flex: 1` (grows to fill space between title and stat)
- `.ifs-stat` is fixed `width: 26rem` on desktop, `width: 18rem` on tablet
- Arrow is `flex-shrink: 0`, 5rem × 5rem circle

### Mobile reflow (≤ 749px)

The row wraps to two lines:
- Line 1: number + title + arrow (arrow pushed right via `margin-left: auto`)
- Line 2: stat block (full width, `padding-left: 7.2rem` to align under title)
- `.ifs-divider` is hidden on mobile
- Arrow gets `order: 3`, stat gets `order: 4`

---

## Known decisions

1. **`arrow-up-right` snippet** — uses the theme's existing `{% render 'arrow-up-right' %}` snippet for both the row arrow and footer CTA link. This ensures the icon matches all other arrows across the theme.

2. **`color-{scheme} gradient`** — both classes are always required for the Shopify color scheme background to render. The `gradient` class alone triggers the background paint in this theme. Never use `color-{scheme}` without `gradient`.

3. **Accent color via `rgba(var(--color-base-accent-1))`** — no alpha value needed; the comma-separated RGB values in the custom property already produce the correct full-opacity blue. Adding a second argument would reduce opacity unintentionally.

4. **`tab_display` default = `hover`** — matches the screenshot design intent where hovering highlights rows. Merchants can switch to `click` for touch-heavier stores.

5. **Why a separate section instead of Tab Collage Style 2** — multiple attempts to embed this layout inside Tab Collage as a second layout style failed to satisfy the design requirements because the existing Tab Collage DOM structure (two-column image + content) was incompatible with the full-width numbered row layout. The decision was made to build it as a standalone section.

---

## Revision history

| Date | Change |
|------|--------|
| 2026-06-09 | Initial creation — all three files written from scratch |
