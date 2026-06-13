# CLAUDE.md — Moldova Ag Flood-Risk Map

You are implementing a **static, client-only web map** demo. Read `README.md` in full before
writing code — it is the authoritative spec. This file is a quick orientation.

## Non-negotiables
- **Static only. No backend.** MapLibre GL JS + `pmtiles` protocol + (optionally) deck.gl.
  Everything served from a CDN / static host. Precompute all data offline.
- **The live-vs-proposed rule is the soul of this demo.** Real, computed data renders SOLID
  with a green `DATE REALE` stamp. Mocked "proposed" capabilities render with a diagonal
  HATCH + DASHED tangerine border + `PROPUS` stamp. Never blur the two. See README → "The
  live-vs-proposed rule" and §05 of the HTML reference.
- **Three color vocabularies, kept separate:** Lagoon `#469695` = interface only; the blue
  Hydro ramp = evidence only; tangerine `#FCBB15` = proposed only.
- **No rounded corners. Anywhere.** `border-radius: 0`. Hairline 1px borders. Sharp, data-y,
  Fathom-like. No SaaS pill buttons.
- **Romanian first.** RO is the default locale; strings in `i18n/`. Format numbers with
  `Intl.NumberFormat('ro-RO')` (comma decimal, space thousands).
- **No emoji. No invented logo/brand name** (unbranded demo).

## Visual source of truth
- `design-reference/colors_and_type.css` — all design tokens + `@font-face` (licensed fonts in
  `design-reference/fonts/`, keep private). Override the `--r-*` radius tokens to `0`.
- `design-reference/Design Language — Moldova Flood Risk.html` — open it in a browser; it shows
  the theme, palette, flood ramp, type, the live-vs-proposed treatment, icons (field = Lucide
  `sprout`), and the in-situ map composition.

## Basemaps
Carto **Positron** (light, default) / **Positron Dark** (dark mode) / **Esri World Imagery**
(satellite). Same blue ramp + hairline chrome on all three.

## Flood ramp (Hydro, sequential blue — locked)
`#CFE3F2 #9BC4E6 #5E97D1 #2E68B5 #1C4189 #0E2356` (shallow→deep). 1px `rgba(38,56,58,0.28)`
field stroke on light basemaps. Color-blind-safe; do not substitute.

## Build the REAL spine first
Map + RP selector (10/20/50/100/200/500, default 100) + headline stat + field-click exposure
profile + admin-unit panel + persistent provenance ("JRC 90 m, fluvial only"). Then layer the
STUBS (EAL, portfolio intake, "what this becomes" comparison, disabled pluvial + Overture
toggles) in the proposed treatment.

When README and the HTML reference conflict: README wins for behavior, HTML wins for visual
detail.

## Porting
Country-specific values live in `precompute/config.yaml` (bbox, ISO, Overture release/subtype)
plus `DATA_CDN_BASE` in `app/src/config.ts` and a couple of i18n strings. UTM zone, JRC tiles,
and the initial map view derive automatically. See `PORTING.md`.
