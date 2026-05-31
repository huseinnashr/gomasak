# 01 — Project Skeleton

**Covers:** MVP spec §10.1, §2, §5.1 — scaffold, store, localStorage persistence,
empty-state seed, app shell + navigation.
**Depends on:** none. **Milestone:** M1 (walking skeleton).

---

## Scope

Stand up a runnable Vue 3 + Vite SPA **inside `frontend/`** with hash routing, a
**Pinia** store mirrored to `localStorage`, and an app shell with bottom/side
navigation to all planned routes (placeholder views for features not yet built).

Out of scope: any feature logic (recipes, stock, etc.) — only stubs/placeholders.

---

## Tasks

1. **Init project (in `frontend/`)**
   - `npm create vite@latest frontend -- --template vue` (the dir is empty). Confirm
     Node 24 / npm 11.
   - Add deps: `vue-router`, `pinia`. Dev deps: `vitest`, `@vue/test-utils`, `jsdom`.
2. **Vite config**
   - `frontend/vite.config.js`: env-driven `base` — `base: process.env.VITE_BASE || '/gomasak/'`
     (repo is `gomasak`; finalized in plan 10).
3. **Router (hash mode)**
   - `src/router/index.js` with `createWebHashHistory`.
   - Register all routes from spec §9 (Dashboard, recipes list/new/:id/:id/edit,
     stock, calendar, prep, settings) pointing at placeholder views.
4. **Pinia store**
   - `src/stores/app.js`: `defineStore('app', ...)` with state `AppState`
     (`version`, `ingredients`, `stock`, `recipes`, `mealPlans` — all empty arrays);
     actions/getters added per feature in later plans.
   - `src/stores/persistence.js`:
     - `load(store)` — read `gomasak.v1`; if absent/invalid JSON → seed empty state
       into the store (`$patch`).
     - `start(store)` — `store.$subscribe` → **debounced** (~300 ms) serialize whole
       state to the key; flush on `beforeunload`.
5. **Lib helpers**
   - `src/lib/id.js`: `newId()` → `crypto.randomUUID()`.
   - `src/lib/dates.js`: `todayISO()`, `isPastISO(d)`, ISO parse/format helpers.
6. **App shell + styles**
   - `src/App.vue`: header/title + nav links (Recipes, Stock, Calendar, Prep,
     Settings) + `<router-view>`. Mobile-first layout.
   - `src/styles/variables.css` + `global.css`: CSS reset, color/spacing vars,
     base typography, viewport meta in `index.html`.
   - Placeholder view components under `src/views/` for every route.
7. **Boot wiring**
   - `src/main.js`: create app + Pinia; `load(store)` before mount; install router;
     mount; `start(store)` persistence subscription. Boot-time hooks placeholder
     (auto-NotCooked / purge added later in plans 05/09).
8. **Scripts & smoke test**
   - `frontend/package.json` scripts: `dev`, `build`, `preview`, `test`.
   - One Vitest smoke test: store loads empty state when localStorage is empty.

---

## Files Introduced

All under `frontend/`: `vite.config.js`, `vitest.config.js`, `index.html`,
`package.json`, `src/main.js`, `src/App.vue`, `src/router/index.js`,
`src/stores/{app,persistence}.js`, `src/lib/{id,dates}.js`,
`src/styles/{variables,global}.css`, `src/views/*` (placeholders).

---

## Logic Detail

- **Schema version:** `state.version = 1`. Persistence stamps/reads it (basis for
  future migrations and import validation in plan 08).
- **Debounced save:** `$subscribe` fires on every mutation; debounce to avoid a
  write per keystroke; flush on `beforeunload` too.
- **Invalid-state handling:** wrap `JSON.parse` in try/catch; on failure log + seed
  empty (never crash the app on corrupt storage).

---

## Acceptance Criteria

- `npm run dev` serves the SPA; hash routes navigate without 404 on refresh.
- Navigation reaches every route (placeholders OK).
- Mutating state (via a temporary test action) persists across reload.
- Corrupt/empty `gomasak.v1` boots cleanly to empty state.
- `npm run build` produces a working `dist/` (verified with `npm run preview`).
- Smoke test passes.

---

## Risks / Notes

- `base` defaults to `/gomasak/`; for local dev Vite still serves correctly. Plan 10
  confirms it for Pages.
- Keep the **units module** (plan 02) framework-agnostic (pure functions) so it's
  trivially unit-testable independent of Pinia.
- `backend/` stays empty/untouched in the MVP — do not scaffold a server.
