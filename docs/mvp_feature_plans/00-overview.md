# Execution Plan — Overview & Index

**Project:** gomasak — Meal Planning & Ingredient Prep App
**Source docs:** [user_stories.md](../user_stories.md), [mvp_feature_spec.md](../mvp_feature_spec.md)
**This doc:** Index + shared conventions for the per-feature execution plans.
**Status:** Plan (no code written yet)

---

## 1. Confirmed Build Decisions

| Area | Decision |
|------|----------|
| Framework | Vue 3 (`<script setup>`, Composition API) |
| Build | Vite, static output to `dist/` |
| Routing | `vue-router` in **hash mode** (`createWebHashHistory`) |
| **State** | **Pinia** — one store holding the `AppState`, with a persistence subscription mirroring to localStorage. |
| **Styling** | **Plain CSS** — scoped SFC styles + CSS variables; mobile-first. No Tailwind / UI kit. |
| Persistence | `localStorage`, single key `gomasak.v1`, whole-state JSON, debounced writes |
| IDs | `crypto.randomUUID()` |
| Dates | Native `Date` + ISO `YYYY-MM-DD` strings; no date library |
| Testing | **Vitest** (unit tests, esp. the units module) |
| Package manager | **npm** (Node 24.x, npm 11.x present) |
| **App location** | App lives in **`frontend/`** (existing dir). `backend/` exists but is **unused for the MVP** (client-only). |
| **GitHub Pages base** | Repo is **`gomasak`** → `base: '/gomasak/'`. Scaffold env-driven (`VITE_BASE`), default `/gomasak/`. |
| Auth | Dropped entirely (per MVP spec) — single implicit user |
| Language | English UI |

---

## 2. Feature Plan Files (build order)

Each file is a self-contained execution plan: scope, stories covered, tasks, files
to create, logic detail, acceptance criteria, dependencies, tests, and risks.

| # | File | Covers | Depends on |
|---|------|--------|-----------|
| 01 | [01-project-skeleton.md](01-project-skeleton.md) | Vite+Vue+router scaffold, store, localStorage persistence, empty-state seed, app shell/nav | — |
| 02 | [02-units-module.md](02-units-module.md) | Unit families, conversion, aggregation helpers + unit tests (§7.1) | 01 |
| 03 | [03-recipe-management.md](03-recipe-management.md) | Epic 2 (US-2.1–2.6) + implicit ingredient catalog (US-3.1) | 01, 02 |
| 04 | [04-stock.md](04-stock.md) | Epic 3 stock (US-3.2–3.4) with on-read/on-write conversion | 01, 02, 03 |
| 05 | [05-meal-planning.md](05-meal-planning.md) | Epic 4 (US-4.1–4.5) calendar, meal types, override, auto-NotCooked | 01, 03 |
| 06 | [06-ingredient-prep.md](06-ingredient-prep.md) | Epic 5 (US-5.1–5.4) aggregate, inline stock, shortfall, save | 02, 04, 05 |
| 07 | [07-cooking-stock-deduction.md](07-cooking-stock-deduction.md) | Epic 6 (US-6.1–6.2) mark Cooked, snapshot, floor-at-zero, notice | 02, 04, 05 |
| 08 | [08-export-import.md](08-export-import.md) | US-EX.1/EX.2 export & import JSON (replace) | 01 |
| 09 | [09-trashed-recipe-purge.md](09-trashed-recipe-purge.md) | §8 lazy purge of unreferenced trashed recipes | 03, 05, 07 |
| 10 | [10-deploy.md](10-deploy.md) | GitHub Actions → Pages, finalize `base` | all |

---

## 3. Proposed Source Layout (target, for reference)

```
gomasak/
├─ backend/                   # exists but UNUSED in MVP (client-only)
└─ frontend/                  # the Vue app lives here
   ├─ index.html
   ├─ vite.config.js
   ├─ package.json
   ├─ vitest.config.js
   └─ src/
      ├─ main.js
      ├─ App.vue              # app shell: nav + <router-view>
      ├─ router/index.js
      ├─ stores/
      │  ├─ app.js            # Pinia store: AppState + schema version + actions
      │  └─ persistence.js    # subscribe→localStorage (debounced), load, seed
      ├─ units/
      │  ├─ units.js          # families, members, factors
      │  └─ convert.js        # convert(), aggregate(), display helpers
      ├─ lib/
      │  ├─ id.js             # crypto.randomUUID wrapper
      │  └─ dates.js          # today(), isPast(), ISO helpers
      ├─ views/               # one per route
      ├─ components/          # forms, lists, calendar pieces
      └─ styles/              # global.css, variables.css
```

> Per-feature plans 01–10 use `src/store/*.js` shorthand for store actions; with
> Pinia these are **actions/getters on the `app` store** (`src/stores/app.js`),
> not standalone modules. The function names and contracts are unchanged.

Each feature plan lists exactly which of these files it introduces or touches.

---

## 4. Cross-Cutting Conventions

- **Single source of truth:** all reads/writes go through the store; views never
  touch `localStorage` directly.
- **Centralized unit math:** prep aggregation (06) and cooking deduction (07)
  MUST call the units module (02) — no duplicated conversion logic.
- **Time rules on client:** auto-NotCooked and trashed-purge run on app boot and
  at relevant render points; deterministic + idempotent (no cron).
- **Validation:** qty > 0 (except to-taste); serving > 0; units from fixed list and
  family-consistent per ingredient.
- **Mobile-first:** design every screen for phone viewports first.
- **Confirmation gates:** trash recipe, delete stock, mark Cooked, import (replace)
  all require explicit confirmation.

---

## 5. Milestones

- **M1 — Walking skeleton (01):** app boots, routes, state persists, nav works.
- **M2 — Core data (02–04):** units tested; recipes + catalog + stock usable.
- **M3 — Planning loop (05–07):** plan → prep → cook → stock updates end-to-end.
- **M4 — Durability (08–09):** export/import + purge.
- **M5 — Live (10):** deployed to GitHub Pages.

---

## 6. Definition of Done (per feature)

1. All listed acceptance criteria met.
2. New logic covered by tests where it is non-trivial (units, scaling, aggregation,
   deduction, time rules, purge).
3. Works on a phone-width viewport.
4. State changes persist across reload (localStorage) and survive export→import.
5. No unhandled console errors.
