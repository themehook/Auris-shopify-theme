# Slideshow Section — Skill File

## Files

| File | Role |
|------|------|
| `sections/slideshow.liquid` | Main section template — rendering + schema |
| `assets/slideshow.css` | All slideshow and feature list styles |

---

## Feature List

The Feature List is an optional sub-component of each Slideshow `slide` block. It displays up to 4 icon+text items below the slide content (e.g., "30h battery", "IPX5 waterproof").

### Enabling

Schema setting `show_feature_list` (checkbox, default false) on the `slide` block. When false, all feature list settings are hidden via `visible_if`.

### Column count

`feature_columns` select: `"1"`, `"2"`, `"3"`, `"4"`. This controls how many items are rendered and which schema fields are visible (Feature 3 is visible for columns 3 or 4; Feature 4 only for column 4).

### Style variants

`feature_style` select — four values that map to CSS modifier classes on `.slideshow__feature-list`:

| Value | Class | Description |
|-------|-------|-------------|
| `box` | `slideshow__feature-list--box` | Rounded box per item, filled with `feature_color_scheme` background |
| `border` | `slideshow__feature-list--border` | Outlined box per item, no fill |
| `only_text` | `slideshow__feature-list--only_text` | No box, minimal padding |
| `with_dividers` | `slideshow__feature-list--with-dividers` | Vertical dividers between items (controlled by `show_feature_dividers` checkbox separately) |

`feature_color_scheme` is only visible in the editor when `feature_style == 'box'`.

---

## Per-Item Schema (×4, Feature 1–4)

Each feature item has these schema fields. Keys follow the pattern `feature_N_*` where N is 1–4.

| Field | ID pattern | Type | Default | Notes |
|-------|-----------|------|---------|-------|
| Section label | paragraph | — | "Feature N" | Always gated on `show_feature_list` (+ column visibility for 3/4) |
| Title | `feature_N_title` | text | _(blank)_ | Empty by default — item only renders when title OR text is filled |
| Title font size | `feature_N_title_size` | range 16–56px step 2 | 28 | Applied as inline `style` on the title span |
| Text | `feature_N_text` | text | "Feature text" | Caption below the title |
| Show icon | `feature_N_show_icon` | checkbox | true | When false, both `icon_position` and `svg` fields are hidden in the editor AND no icon markup is rendered on the storefront |
| Icon position | `feature_N_icon_position` | select (above/below) | above | Only visible when `show_icon` is true |
| SVG icon code | `feature_N_svg` | textarea | (default SVG) | Only visible when `show_icon` is true |

### visible_if rules

- Feature 1: all fields gated on `block.settings.show_feature_list`
- Feature 2: all fields gated on `show_feature_list and feature_columns != '1'`; `icon_position` and `svg` also add `and feature_2_show_icon`
- Feature 3: all fields gated on `show_feature_list and feature_columns == '3' or show_feature_list and feature_columns == '4'`; `icon_position` and `svg` use compound: `show_feature_list and feature_columns == '3' and feature_3_show_icon or show_feature_list and feature_columns == '4' and feature_3_show_icon`
- Feature 4: all fields gated on `show_feature_list and feature_columns == '4'`; `icon_position` and `svg` also add `and feature_4_show_icon`

**Key rule for compound `visible_if`:** `and` has higher precedence than `or` in Shopify. Place `and show_icon` inside each half of an `or` condition — not outside — so it applies to both branches.

---

## Rendering Logic

### has_features detection

Before rendering the list, the template checks whether at least one item has content. It checks both `ft_key` (text) and `fti_key` (title) — a title-only item still triggers the container:

```liquid
assign has_features = false
if block.settings.show_feature_list
  assign feature_cols = block.settings.feature_columns | plus: 0
  for fi in (1..4)
    if fi > feature_cols
      break
    endif
    assign ft_key  = 'feature_' | append: fi | append: '_text'
    assign fti_key = 'feature_' | append: fi | append: '_title'
    if block.settings[ft_key] != blank or block.settings[fti_key] != blank
      assign has_features = true
      break
    endif
  endfor
endif
```

### Item loop

Dynamic keys are built with `| append:` inside the loop:

```liquid
{%- assign ft_key  = 'feature_' | append: fi | append: '_text' -%}
{%- assign fti_key = 'feature_' | append: fi | append: '_title' -%}
{%- assign fts_key = 'feature_' | append: fi | append: '_title_size' -%}
{%- assign fs_key  = 'feature_' | append: fi | append: '_svg' -%}
{%- assign fp_key  = 'feature_' | append: fi | append: '_icon_position' -%}
{%- assign fsi_key = 'feature_' | append: fi | append: '_show_icon' -%}
{%- if block.settings[ft_key] != blank or block.settings[fti_key] != blank -%}
  <div class="slideshow__feature-item slideshow__feature-item--icon-{{ block.settings[fp_key] }} {{ item_scheme_class }}">
    {%- if block.settings[fsi_key] and block.settings[fs_key] != blank -%}
      <span class="slideshow__feature-icon">{{ block.settings[fs_key] }}</span>
    {%- endif -%}
    {%- if block.settings[fti_key] != blank -%}
      <span class="slideshow__feature-title" style="font-size: {{ block.settings[fts_key] }}px;">{{ block.settings[fti_key] }}</span>
    {%- endif -%}
    {%- if block.settings[ft_key] != blank -%}
      <span class="slideshow__feature-text">{{ block.settings[ft_key] }}</span>
    {%- endif -%}
  </div>
{%- endif -%}
```

---

## CSS Classes

All feature list styles live in `assets/slideshow.css` under the `/* Slide Feature List */` section.

### Key classes

| Class | Purpose |
|-------|---------|
| `.slideshow__feature-list` | Flex container, wraps items |
| `.slideshow__feature-item` | Single item — flex column, centered |
| `.slideshow__feature-item--icon-above` | Default — icon above text (no extra class needed, default direction) |
| `.slideshow__feature-item--icon-below` | `flex-direction: column-reverse` |
| `.slideshow__feature-icon` | SVG wrapper |
| `.slideshow__feature-title` | Bold large title text (e.g. "30h") — font-size set via inline style |
| `.slideshow__feature-text` | Small caption text |

### `.slideshow__feature-title` CSS

```css
.slideshow__feature-title {
  font-size: 2.8rem;   /* fallback only — inline style from schema takes precedence */
  font-weight: 700;
  line-height: 1.2;
  color: rgba(var(--color-foreground));
  white-space: nowrap;
}
```

The inline `style="font-size: Npx;"` always overrides the CSS class rule. No responsive breakpoint overrides are needed or useful here — the inline style applies at all viewport sizes.

---

## Key Decisions

1. **Title-only items must trigger the container** — The `has_features` check uses `OR` across both `ft_key` and `fti_key`. If only `ft_key` (text) were checked, a feature with only a title would silently be skipped.

2. **Inline style for font-size** — The range slider value is applied directly as `style="font-size: Npx;"` on the title span. This always wins over any CSS class, eliminating the need for section-scoped style block overrides or `!important` CSS.

3. **`show_icon` gates both editor fields and storefront output** — Unchecking "Show icon" collapses `icon_position` and `svg` in the editor (via `visible_if`), and the Liquid `if fsi_key and fs_key != blank` guard ensures no SVG markup or empty space renders on the storefront.

4. **Feature 3's compound `visible_if`** — Feature 3 appears for columns `'3'` OR `'4'`. Adding `and show_icon` requires placing the condition inside each half: `A and B and show_icon or A and C and show_icon`. Shopify's `visible_if` evaluates `and` before `or`.

5. **Empty icon field still hidden** — The storefront render checks `block.settings[fsi_key] and block.settings[fs_key] != blank` — both conditions must pass. So even if `show_icon` is true, an empty SVG field produces no output.
