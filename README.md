# Handoff: Moldova Agricultural Flood-Risk Map (Demo)

> A static, client-only web map that shows the flood exposure of Moldova's agricultural
> land. It does two things at once: it renders **real, computed evidence** (JRC flood
> hazard + Fields-of-The-World boundaries) and it stages **labeled, mocked "proposed
> capabilities"** (the pitch — EAL, portfolio intake, a national Fathom-grade map, pluvial,
> Overture extensions). The whole demo is built to **argue for its own replacement** without
> ever letting a viewer confuse what is true today with what is being proposed.

---

## Overview

**What this is for.** A funding / partnership demo aimed at banks (MAIB), Moldovan
government bodies, catastrophe modelers (Fathom), and donors. It must read as an
**institutional instrument** — a national mapping agency or a bank's risk portal — not a
SaaS landing page or an "AI" product.

**Primary language is Romanian (RO).** English (EN) follows. Build i18n in from day one;
ship RO as default.

**The single most important idea in this whole package:** there is a strict, persistent
visual distinction between **live data** and **proposed capability**. See
[The live-vs-proposed rule](#the-live-vs-proposed-rule). If you implement nothing else
faithfully, implement that.

---

## About the design files

The files in `design-reference/` are a **design reference created in HTML** — a
*style board* that locks the visual language (color, type, the live-vs-proposed treatment,
iconography, sharp-edged "data-y" aesthetic). **They are not production code to copy.**

`design-reference/Design Language — Moldova Flood Risk.html` is the canonical visual
reference. Open it in a browser first. Everything below describes the **application** to be
built from that language.

Your job: **recreate this design language as a real static web map** in an appropriate
modern stack (recommendation below), using the documented tokens, treatment rules, and
behaviors. Where this README and the HTML reference ever disagree, **this README wins** for
*application behavior*; the **HTML wins** for *visual detail* (exact colors, type, spacing).

---

## Fidelity

- **Visual system: hi-fi and locked.** Colors, type, the sharp/hairline aesthetic, the
  flood ramp, the live-vs-proposed treatment, and the field icon are final. Reproduce them
  exactly from `colors_and_type.css` and the HTML reference.
- **Application layout: specified, not pixel-mocked.** The map view and its panels are
  described in detail here but were not each drawn as a separate pixel comp. Build them to
  this spec, honoring the locked visual language. Use judgment for micro-layout; keep it
  institutional and restrained.

---

## Tech & serving (hard constraints)

- **Zero backend. Fully static.** All assets — vector tiles, JSON, rasters — served from
  S3 / Cloudflare (or any static host / CDN).
- **Map engine:** [MapLibre GL JS](https://maplibre.org/) with the
  [`pmtiles`](https://github.com/protomaps/PMTiles) protocol for vector/raster tiles.
- **Data overlays / styling of fields:** [deck.gl](https://deck.gl/)
  (`MVTLayer` / `GeoJsonLayer`) **or** native MapLibre data-driven paint — either is
  acceptable; deck.gl is preferred for the per-return-period restyle and for portfolio
  highlighting because it makes attribute-driven color transitions trivial.
- **No map data is fetched from a server we run.** Precompute everything offline (see
  [Data contract](#data-contract)) and publish as static files.
- **Framework:** vanilla TypeScript + Vite is perfectly fine and keeps the bundle lean. If
  you prefer React, React + Vite + `react-map-gl` (MapLibre mode) is fine too. Pick one and
  be consistent. No SSR, no Next.js — it's a static SPA.
- **i18n:** per-locale string JSON, swapped client-side. Romanian number formatting via
  `Intl.NumberFormat('ro-RO')`. See [Internationalization](#internationalization).

---

## The live-vs-proposed rule

Two visual registers, applied everywhere, so a viewer **always** knows whether they're
looking at evidence or a pitch:

| | **LIVE (real, computed)** | **PROPOSED (mocked stub — the pitch)** |
|---|---|---|
| Fill | Solid, full-saturation (the blue flood ramp) | Diagonal **hatch** (`repeating-linear-gradient`, 45°) |
| Stroke | Solid 1px hairline | **Dashed** 1px, tangerine `#FCBB15` |
| Stamp | `DATE REALE` — green `#3F8F6E`, mono, with a solid square dot | `PROPUS` — tangerine `#FCBB15`, mono, dashed border, hollow dot |
| Editable mock values | — | tangerine mono text with a dashed underline + `✎` |
| Tone of copy | Plain, factual, states limits | "method real, coefficients placeholder" — honest about being a mock |

The hatch + dashed-tangerine + `PROPUS` stamp combination appears on **every** stub: map
layers, side panels, and toggles. The eye should learn it once. See §05 of the HTML
reference for the exact rendering of both registers.

**Tangerine `#FCBB15` is reserved exclusively for "proposed."** It must never appear in the
chrome or in the flood ramp.

---

## Visual system (locked)

Pull exact values from `design-reference/colors_and_type.css`. Highlights:

### Theme & basemaps
- **Light is the default.** Dark is an option (a toggle, not a separate design).
- **Basemaps (toggle, 3 options):**
  1. **Carto Positron** — light. **Default.**
  2. **Carto Positron Dark** — used with dark mode.
  3. **Esri World Imagery** — satellite. (Esri's tiles; respect their attribution/ToS, or
     swap for an equivalent open satellite/ortho source.)
- Carto Positron/Dark styles: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
  and `.../dark-matter-gl-style/style.json` (or self-host the style + glyphs for the static
  guarantee). The same blue flood ramp and hairline chrome ride on top of all three.

### Sharp, data-y aesthetic
- **No rounded corners. Anywhere.** `border-radius: 0` on every button, card, chip, panel,
  input, and the map container. This is deliberate — straight, thin lines like Fathom's
  site. Do **not** ship rounded "app" buttons.
- **Hairline borders:** `1px` at `rgba(38,56,58,0.12)` (light) / `rgba(239,235,234,0.14)`
  (dark). Borders are quiet; shadows are rare.

### Three color vocabularies — never blurred
- **Lagoon `#469695` = interface only** (active state, selection, links, primary buttons).
- **Blue flood ramp = evidence only** (the data; see below).
- **Tangerine `#FCBB15` = proposed only** (the stubs).

### Flood-exposure ramp — "Hydro", sequential blue (LOCKED)
Reads as **depth of inundation at the selected return period**. Single-hue, color-blind-safe,
prints cleanly. Six stops, shallow → deep:

```
#CFE3F2  #9BC4E6  #5E97D1  #2E68B5  #1C4189  #0E2356
```

On a light basemap, give each field a `1px` `rgba(38,56,58,0.28)` hairline stroke so parcels
stay crisp. A "severity / diverging-to-tangerine" alternative was considered and **parked** —
do not build it unless asked.

### Typography (licensed brand fonts, bundled in `design-reference/fonts/`)
- **Display — Vert Grotesk Display.** Headline stat + section titles. Weights 300–700 + VF.
- **Body / UI — Neue Swiss.** Everything readable.
- **Mono — Berkeley Mono.** Data, units, labels, provenance, the RP selector. The mono does
  most of the "instrument" work.
- All `@font-face` declarations are already wired in `colors_and_type.css`. **These fonts are
  licensed** — keep them private; do not commit to a public repo without confirming the
  license. Fraunces/Inter are declared as graceful fallbacks.
- Sentence case everywhere. No ALL-CAPS except small mono eyebrow labels (`.14em` tracking).
  **No emoji, ever.**

### Iconography
- **Lucide**, `1.75px` stroke, line-only, `currentColor`. Sizes 16/20/24/32; 24 default.
- **The "fields" icon is the Lucide `sprout` mark.** (Chosen over cadastral/parcel marks —
  warmer, more legible small, reads instantly as agriculture.) See §07 of the HTML reference,
  far-right highlighted icon, for the exact path.

---

## Screens / views / panels

Tagged **[REAL]** (the computed spine — must render solid and correct) or **[STUB]** (mocked
pitch — must wear the proposed treatment).

### 1. Map view — the spine **[REAL]**
- **Layout:** full-bleed map fills the viewport. Chrome floats over it with hairline borders
  and sharp corners — nothing boxes the map in. Light theme by default.
- **Fields are the only geometry** drawn as data. They are styled by flood exposure (Hydro
  ramp) at the currently selected return period. Admin-unit boundaries render as thin lines
  for context/selection but are not filled by default.
- **Floating chrome:**
  - **RP selector** — top-center (see §2).
  - **Provenance chip** — top-right: `DATE REALE · JRC 90 M` (green, mono). Always visible.
  - **Legend** — bottom-left: ramp bar + `Expunere · adâncime` label + `mică`/`mare` ends.
  - **Headline stat** — on load (see §3).
  - **Basemap toggle** + **language toggle (RO/EN)** — corner controls, mono labels.
- See §04 of the HTML reference for the in-situ composition.

### 2. Return-period selector **[REAL]**
- Segmented control, **mono labels**, sharp corners: `RP10 · RP20 · RP50 · RP100 · RP200 · RP500`.
- Active segment = Lagoon fill, white text. Default selection: **RP100**.
- Changing it **restyles the fields live** (data-driven paint / deck.gl color accessor reading
  the per-RP depth attribute). Animate the color transition subtly (~200ms).

### 3. Headline stat (on load) **[REAL]**
- **One big number**, the largest type on the page (Vert Grotesk Display).
- Copy (RO): **"X% din terenul agricol cartografiat se află în zona inundabilă de 1-din-100 ani."**
  Placeholder value `38%` — replace with the precomputed real figure.
- The number is the only thing in Lagoon; the sentence is in Ponderosa.

### 4. Field click → exposure profile **[REAL]**
- Clicking a field opens a small panel/popover: the field's **exposure across all six RPs** —
  `% inundated` and `mean depth (m)` per RP (small table or sparkline).
- Carries a plain caption: depths are **indicative at 90 m resolution**.
- `DATE REALE` stamp.

### 5. Admin unit hover/click → panel **[REAL]** — *the "act on it" numbers*
- Hover a raion → highlight outline. Click → panel with, for the selected RP:
  - `Suprafață agricolă totală` (total ag area, ha)
  - `Expusă la RP{n}` (area exposed, ha) — value in Lagoon
  - `Câmpuri afectate` (field count touched)
  - `Pondere teren arabil inundabil` (share of cropland in floodplain, %) — value in Lagoon
- `DATE REALE` stamp. See §05-left of the HTML reference for the exact panel styling.

### 6. Data-provenance surface **[REAL]**
- Always-present statement of what's real and JRC's limits, stated **plainly, not
  apologetically**: JRC, **90 m**, **fluvial (riverine) only**, modeled. The persistent
  top-right chip plus an expandable "about the data" note.

### 7. EAL panel (Expected Annual Loss) **[STUB]**
- Shows the **assembled chain** with **placeholder coefficients** and **editable assumptions**:
  - `Valoare expusă` — editable `€ / ha` (tangerine mono + `✎`)
  - `Curbă de daune` — selectable damage curve (e.g. "JRC depth-damage")
  - `EAL estimat` — computed € / year from the (real) exposure × (placeholder) coefficients
- Loud tag: **"coeficienți substituibili — metodă reală"** (coefficients placeholder — method
  real). `PROPUS` stamp. This is the slot where a cat modeler / Fathom plugs in.

### 8. Portfolio intake **[STUB]** — *the MAIB hook*
- **"Încarcă portofoliu"** (Load portfolio) → ingests a **sample parcel CSV** (bundled) →
  lights matching fields on the map → shows: **portfolio EAL**, **parcels exposed at RP100**,
  **concentration by raion**.
- Mock data, **real workflow**. `PROPUS` stamp on outputs; the upload affordance itself can be
  live (it really parses the sample CSV).

### 9. "What this becomes" — data-quality comparison **[STUB]** — *the funding close*
- Side-by-side, a **real panel, not a footnote**:
  - **Floor:** JRC 90 m, riverine-only (what's live today).
  - **Ceiling:** silhouette of a **Fathom national map** — pluvial + fluvial, ~30 m,
    defended/undefended.
- `PROPUS` treatment on the ceiling side.

### 10. Pluvial layer toggle **[STUB]**
- Present in the layer controls but **greyed / "indisponibil în datele curente"** (not
  available in current data). Visible so the **gap is felt**. Ghost/disabled treatment.

### 11. Overture extension toggles **[STUB]**
- **Building footprints** ("same method runs on assets") and **critical infrastructure**
  ("government planning hook"). Greyed stubs, captioned **"se extinde cu datele proiectului"**
  (extends with project data). Proposed treatment.

---

## Interactions & behavior

- **RP change** → recolor fields (animated ~200ms) + update any open admin/field panel + the
  legend stays fixed (depth scale).
- **Field click** → exposure-profile popover. **Admin hover** → outline; **click** → panel.
- **Basemap toggle** → Positron / Positron Dark / Esri satellite. Dark basemap also flips
  chrome to dark theme tokens.
- **Language toggle** → swap all strings RO ⇄ EN and reformat numbers for the locale.
- **Stubs are interactive workflows** with mock data (esp. portfolio upload + EAL assumption
  edits), always wearing the proposed treatment.
- **Motion:** durations 120/200/320ms; ease-out `cubic-bezier(0.2,0.6,0.2,1)`. No bounce, no
  parallax. Page-load: content fades up 8px / 320ms.
- **Accessibility:** 2px Lagoon focus ring, always visible. The single-hue ramp is the
  color-blind-safe choice; never rely on color alone for the live/proposed distinction — the
  stamps and hatch carry it too.

---

## State management

Minimal client state (no server):

```
selectedRP            : 10|20|50|100|200|500   (default 100)
theme                 : 'light'|'dark'          (default 'light')
basemap               : 'positron'|'positron-dark'|'satellite' (default 'positron')
locale                : 'ro'|'en'               (default 'ro')
selectedFieldId       : string | null
selectedAdminId       : string | null
portfolio             : { loaded: bool, rows: Parcel[] }      // stub
ealAssumptions        : { eurPerHa: number, damageCurve: string } // stub, editable
layers                : { pluvial:false(disabled), footprints:false(disabled), infra:false(disabled) }
```

No data fetching from an owned backend; all data is static files loaded on demand.

---

## Data contract

Everything is **precomputed offline** and published as static files. Suggested shapes:

- **Field boundaries (FTW)** — `fields.pmtiles` (vector). Per-feature attributes:
  - `id`, `area_ha`
  - per RP: `pct_inun_{rp}` (0–100), `depth_{rp}` (mean depth, m) for rp ∈ {10,20,50,100,200,500}
  - `min_rp` (lowest RP at which the field is inundated) — for future severity view
- **JRC flood hazard** — either baked into the field attributes above (preferred; the map only
  needs the per-field summary) or, if you want a raster underlay, per-RP **COG** depth rasters
  (90 m, fluvial, Moldova extent). The fields are the styled geometry, so attribute summaries
  are the primary need.
- **Admin units (raioane)** — `admin.pmtiles` or `admin.geojson`. Per unit, per RP:
  `total_ag_ha`, `exposed_ha_{rp}`, `fields_touched_{rp}`, `cropland_share_{rp}`.
- **Headline figure** — `summary.json`: `{ pct_ag_in_rp100_floodplain: number, ... }`.
- **Portfolio sample (stub)** — `sample_portfolio.csv`. Suggested columns:
  `parcel_id, field_id (or lat, lon), crop, value_eur`. Matched to `fields` by `field_id` or
  point-in-polygon at load.
- **Ramp class breaks (depth, m)** — define and document the 6 bucket thresholds used to map
  depth → ramp stop (e.g. 0–0.25 / 0.25–0.5 / 0.5–1 / 1–2 / 2–4 / 4+; confirm with the data).

> Note: the geometry in the HTML reference's map is **schematic placeholder** — real fields
> come from FTW boundaries.

---

## Internationalization

- **RO is the default and ships first.** EN strings live alongside but the EN toggle can be a
  fast-follow.
- Strings in `i18n/ro.json` and `i18n/en.json` (starters provided in this bundle), keyed and
  swapped client-side. Do **not** hardcode user-facing copy.
- **Number formatting:** use `Intl.NumberFormat('ro-RO')`. Romanian uses a **comma decimal**
  and **space (or `.`) thousands separator** — e.g. `3 612 ha`, `25,3%`, `€ 1,9 M`. The EN
  locale uses `Intl.NumberFormat('en-US')`.
- Test the diacritics **ă â î ș ț** in the brand fonts (already verified in the reference).

---

## Design tokens

Authoritative source: **`design-reference/colors_and_type.css`** (108 CSS custom properties).
Key values:

**Color**
- Chrome: map base `#121A19`, Ponderosa `#26383A`, Dusty white `#EFEBEA`, raised dark `#2D4244`
- Interaction: Lagoon `#469695` (hover `#3B7F7E`, pressed `#2F6766`), Lagoon-200 `#9BC3C2` (on dark)
- Flood ramp (Hydro): `#CFE3F2 #9BC4E6 #5E97D1 #2E68B5 #1C4189 #0E2356`
- Status: success/real `#3F8F6E`, warning/caveat `#C98A1A`
- Proposed: tangerine `#FCBB15` (reserved)
- Light map ground (Positron-ish, used in reference): `#E4E1DE`

**Type** — families `--font-display` / `--font-body` / `--font-mono`. Scale (rem, 16px base):
12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 64 / 80 / 112. Headline stat uses the top of
the scale.

**Spacing** (4-pt): 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96 / 128.

**Radius: `0` everywhere** (override the brand `--r-*` tokens to 0 for this product).

**Motion:** `--dur-fast 120ms / --dur-base 200ms / --dur-slow 320ms`; ease-out
`cubic-bezier(0.2,0.6,0.2,1)`.

---

## Assets

- **Fonts** — `design-reference/fonts/` (Vert Grotesk Display, Neue Swiss, Berkeley Mono).
  **Licensed**; keep private. Wired in `colors_and_type.css`.
- **Icons** — Lucide (npm `lucide` or CDN). Field icon = `sprout`.
- **Basemap styles** — Carto Positron / Positron Dark (CDN or self-hosted); Esri World Imagery
  (respect attribution).
- **Logos / brand name** — **none yet.** This is an unbranded demo; do not invent a logo.
- **Map/field data** — not included; produced per the [Data contract](#data-contract).

---

## Files in this bundle

```
design_handoff_moldova_flood_map/
├── README.md                                  ← this file (self-sufficient spec)
├── CLAUDE.md                                  ← drop-in instructions for the Claude Code agent
├── design-reference/
│   ├── Design Language — Moldova Flood Risk.html   ← canonical visual reference (open first)
│   ├── colors_and_type.css                    ← authoritative design tokens + @font-face
│   └── fonts/                                 ← licensed brand fonts (private)
├── i18n/
│   ├── ro.json                                ← Romanian strings (default)
│   └── en.json                                ← English strings
└── data/
    └── data-contract.md                       ← expanded data shapes & precompute notes
```

---

## Suggested build order

1. Scaffold a static SPA (Vite + TS, or React + Vite). Wire `colors_and_type.css` + fonts;
   override `--r-*` radii to `0`.
2. MapLibre + `pmtiles` protocol; load Carto Positron + the FTW fields source.
3. Data-driven paint: color fields by `depth_{selectedRP}` via the Hydro ramp + hairline stroke.
4. Build floating chrome: RP selector, legend, provenance chip, headline stat, basemap +
   language toggles. (Sharp corners, hairline borders, mono labels.)
5. Field-click exposure profile + admin-unit panel (the REAL spine complete).
6. i18n (RO default) + `Intl.NumberFormat` wiring.
7. Stubs, each in the proposed treatment: EAL panel, portfolio intake, "what this becomes"
   comparison, pluvial toggle (disabled), Overture toggles (disabled).
8. Dark theme + satellite basemap toggle.

Ship the REAL spine first; it must stand on its own. The stubs are the pitch layered on top.
