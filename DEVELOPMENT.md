# Development

The authoritative spec for this product lives in **[README.md](./README.md)**
(visual language, screens, panels, the live-vs-proposed rule, the
data contract). Read that first — it is the source of truth.

This file documents how the implementation is wired up.

## Layout

```
moldova-flood-risk/
├── README.md              ← SPEC (do not treat as an intro readme)
├── CLAUDE.md              ← agent-facing orientation
├── DEVELOPMENT.md         ← this file
├── data-contract.md       ← per-file data schemas (FTW + JRC + admin)
│
├── design-reference/      ← canonical visual reference
│   ├── colors_and_type.css       ← 108 design tokens (authoritative)
│   ├── Design Language - Moldova Flood Risk.html
│   └── fonts/                    ← LICENSED, gitignored
│
├── i18n/                  ← Romanian (default) + English strings
│   ├── ro.json
│   └── en.json
│
├── app/                   ← Vite + React + TS + Tailwind v4 + shadcn/ui
│   ├── public/
│   │   ├── data/                 ← precompute output (committed)
│   │   └── fonts/                ← symlinks → design-reference/fonts/
│   ├── src/
│   │   ├── components/
│   │   ├── map/                  ← MapLibre + pmtiles plumbing
│   │   ├── lib/                  ← state, i18n, formatters, utils
│   │   ├── styles/
│   │   │   └── tokens.css        ← MIRROR of design-reference tokens
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css             ← Tailwind v4 + @theme + base layer
│   ├── components.json    ← shadcn/ui config
│   ├── eslint.config.js   ← BANS literal `rounded-*` classes
│   ├── tailwind.config: not used (CSS-first via @theme)
│   ├── vite.config.ts
│   └── package.json
│
└── precompute/            ← Python + uv. Offline data pipeline.
    ├── Makefile           ← `make data` runs the whole chain
    ├── pyproject.toml
    └── src/moldova_precompute/
        ├── __init__.py    ← click CLI entry
        ├── const.py       ← single source of truth: URLs, bbox, RPs, breaks
        ├── extract_fields.py
        ├── fetch_jrc.py
        ├── zonal_stats.py
        ├── build_admin.py
        └── build_summary.py
```

## Quick start

```bash
# Front-end dev server
cd app
pnpm install     # if you haven't yet
pnpm dev         # http://localhost:5173/

# Data pipeline (one-shot offline)
cd precompute
make data        # → app/public/data/*.json
```

## Stack — at a glance

| Layer | Choice |
|---|---|
| Build | Vite 8 |
| UI runtime | React 19 |
| Language | TypeScript 6 |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) |
| Components | shadcn/ui (radii overridden to 0) |
| Map engine | MapLibre GL JS 5 |
| Tile protocol | `pmtiles` (registered as a custom protocol) |
| State | Zustand |
| Icons | Lucide (`sprout` is the field mark) |
| CSV parse | PapaParse (portfolio stub) |
| Lint | ESLint flat config + custom `rounded-*` ban |
| Data pipeline | Python 3.12 + uv |
| Zonal stats | exactextract + rasterio + geopandas |
| Deploy | Vercel (static export) |

## Non-negotiables

These are enforced by the code, not by convention. Don't try to relax them
without changing the spec first.

- **No rounded corners. Anywhere.**
  - Tailwind `--radius-*` tokens all map to `0` in `@theme`.
  - ESLint rule `no-restricted-syntax` blocks `rounded-*` class literals.
  - `app/src/index.css` overrides MapLibre's default control radii to 0.
- **Three color vocabularies, never blurred.**
  - `bg-lagoon` / `text-lagoon` / `border-lagoon` — interface only.
  - `bg-flood-1` … `bg-flood-6` — evidence (the data) only.
  - `bg-proposed` / `border-proposed` / `text-proposed` — proposed only.
- **No emoji** in source or copy. (The `✎` edit affordance on stubs is a
  Unicode glyph, not an emoji — it ships as text, not a font emoji.)
- **No invented logo or brand name.** This is an unbranded demo.
- **Licensed fonts gitignored.** Falls back to Fraunces (display) + Inter
  (body) from Google Fonts. Drop the real fonts into
  `design-reference/fonts/` locally to render in full fidelity.

## The live-vs-proposed treatment

Spec defines two visual registers. They're implemented as global CSS:

| | LIVE | PROPOSED |
|---|---|---|
| Fill | `.bg-flood-{1..6}` | `.proposed-hatch` (45° diagonal `repeating-linear-gradient`) |
| Stroke | `.real-border` (1px hairline) | `.proposed-border` (1px dashed tangerine) |
| Stamp | `<span className="stamp-real">Date reale</span>` | `<span className="stamp-proposed">Propus</span>` |
| Editable mock value | — | `<span className="proposed-editable">€ 1.200</span>` |

Pull from these classes; don't invent ad-hoc styles for them. They are
defined in `app/src/index.css` under `@layer components`.

## Common commands

```bash
# Frontend
pnpm dev          # vite dev server
pnpm build        # tsc + vite build → dist/
pnpm preview      # serve dist/ locally
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint (incl. rounded-* ban)

# Precompute
make data         # full pipeline
make info         # resolved paths + constants
make clean        # nuke _work/ + shipped JSON
make clean-jrc    # only the JRC raster cache
```

## Deploy

Target: Vercel static. See phase 8 (current task list) for the
`vercel.json` and deploy script.

## License + attribution

- JRC GloFAS flood hazard maps — © European Union, CC BY 4.0.
- FTW field boundaries — CC BY 4.0.

Both attribution strings ship with the app in the provenance chip's
"Despre date" expander.
