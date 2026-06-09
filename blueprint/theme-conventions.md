# Skill: Luno Theme Conventions

Patterns and rules that apply across all sections in this theme. Read this before writing any new section or modifying an existing one.

---

## Color schemes

Always apply both classes together:

```html
<div class="color-{{ section.settings.color_scheme }} gradient">
```

The `gradient` class triggers the background paint. Using `color-{scheme}` alone produces no background color.

---

## CSS custom properties

| Property | Usage |
|----------|-------|
| `rgb(var(--color-foreground))` | Main text, borders |
| `rgb(var(--color-background))` | Section background |
| `rgba(var(--color-base-accent-1))` | Accent / highlight color (blue in Luno) |
| `rgba(var(--color-button), var(--alpha-button-background))` | Button background |
| `rgb(var(--color-button-text))` | Button label color |

Note: these variables store comma-separated RGB values (e.g. `0, 122, 255`), not full `rgb()` strings. Always wrap them with `rgb()` or `rgba()`.

---

## Richtext → multi-line display heading

To render a richtext field as stacked lines with the second line faded:

**Liquid** — replace block-level tags with `<span>`:

```liquid
{{
  section.settings.heading
  | replace: 'p>', 'span>'
  | replace: 'h1>', 'span>'
  | replace: 'h2>', 'span>'
  | replace: 'h3>', 'span>'
  | replace: 'h4>', 'span>'
  | replace: 'h5>', 'span>'
  | replace: 'h6>', 'span>'
}}
```

**CSS** — stack spans and dim the second:

```css
.my-heading span { display: block; }
.my-heading span + span { color: rgba(var(--color-foreground), 0.38); }
```

The merchant enters two paragraphs in the editor — first is full opacity, second is faded.

---

## Placeholder SVG technique

For image pickers that may be empty, show a colored placeholder with a white SVG icon:

**Liquid:**

```liquid
{%- assign placeholder_name = 'product-' | append: slot -%}
{{ placeholder_name | placeholder_svg_tag: 'placeholder-svg' }}
```

The `assign` line is mandatory — do not inline the expression directly into `placeholder_svg_tag`.

**CSS (per slot):**

```css
.my-img--1.my-img--no-image {
  background: linear-gradient(145deg, #d4c5b2 0%, #b8a898 100%);
}
.my-img--no-image .placeholder-svg {
  fill: rgba(255, 255, 255, 0.45) !important;
  stroke: none !important;
}
```

---

## Container classes

| Setting value | Class applied |
|---------------|---------------|
| `boxed` | `container` |
| `full` | `container-fluid` |

```liquid
{%- liquid
  assign container_class = 'container'
  if section.settings.container == 'full'
    assign container_class = 'container-fluid'
  endif
-%}
```

---

## Section padding pattern

Every section uses a per-section-id class for padding, with desktop/mobile breakpoints:

```liquid
{%- style -%}
  .my-section--{{ section.id }} {
    padding-top: {{ section.settings.mobile_padding_top }}px;
    padding-bottom: {{ section.settings.mobile_padding_bottom }}px;
  }
  @media screen and (min-width: 750px) {
    .my-section--{{ section.id }} {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }
{%- endstyle -%}
```

Standard schema settings for padding:

```json
{ "type": "range", "id": "padding_top", "min": 0, "max": 150, "step": 5, "unit": "px", "label": "Padding top", "default": 60 },
{ "type": "range", "id": "padding_bottom", "min": 0, "max": 150, "step": 5, "unit": "px", "label": "Padding bottom", "default": 60 },
{ "type": "range", "id": "mobile_padding_top", "min": 0, "max": 150, "step": 5, "unit": "px", "label": "Padding top", "default": 40 },
{ "type": "range", "id": "mobile_padding_bottom", "min": 0, "max": 150, "step": 5, "unit": "px", "label": "Padding bottom", "default": 40 }
```

---

## Arrow icon snippet

The theme has a reusable arrow snippet:

```liquid
{%- render 'arrow-up-right' -%}
```

Use this for all arrow icons — row arrows, CTA links, tab icons — so they stay visually consistent.

---

## Shopify section editor reload

Always wire up the `shopify:section:load` event in section JavaScript so that the section reinitialises after being added or reloaded in the theme editor:

```js
document.addEventListener('shopify:section:load', function (e) {
  e.target.querySelectorAll('.my-list').forEach(initMySection);
});
```

---

## Responsive breakpoints used in this theme

| Breakpoint | Meaning |
|------------|---------|
| `min-width: 750px` | Tablet and above |
| `min-width: 990px` | Desktop (some sections use 991px) |
| `max-width: 749px` | Mobile only |
| `max-width: 991px` | Tablet and below |

---

## Animated vertical indicator line pattern

Used in Interactive Feature Showcase and similar row-based sections:

```css
.my-indicator {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 0.2rem;
  background: rgba(var(--color-base-accent-1));
  transform: scaleY(0);
  transform-origin: top center;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.my-item.is--active .my-indicator,
.my-item:hover .my-indicator {
  transform: scaleY(1);
}
```

Parent row must have `position: relative`.
