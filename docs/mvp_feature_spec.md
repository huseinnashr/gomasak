# MVP Feature Spec — Meal Planning & Ingredient Prep App

**Platform:** Mobile-first web app (static, client-only)
**Stack:** Vue 3 + Vite, bundled to static HTML/CSS/JS
**Hosting:** GitHub Pages (static)
**Persistence:** Browser `localStorage` (single JSON blob)
**Backend:** None
**Document owner:** Architecture
**Source:** Derived from [user_stories.md](user_stories.md)
**Last updated:** 2026-05-31
**Status:** Draft for build

---

## 1. Scope Changes vs. User Stories

This MVP is a **client-only, single-user** app. The following changes apply to the
original [user stories](user_stories.md):

| Change | Detail |
|--------|--------|
| **No backend** | All logic runs in the browser. No server, no API, no DB. |
| **No authentication** | Epic 1 (Authentication) is **dropped entirely** — no login, logout, PIN, users table, or hashing. |
| **Single profile** | The `User` entity is removed. There is exactly one implicit user. All `user_id` foreign keys are dropped. |
| **localStorage persistence** | The entire app state is one JSON object under a single localStorage key. |
| **Export / Import (new)** | Replaces accounts/backup. The user can export all data to a JSON file and import it back, for backup or moving to another device/browser. |

Everything else (recipes, ingredients, stock, meal planning, prep, cooking,
units/conversion) is **retained as specified**.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────┐
│  Browser (GitHub Pages static bundle)        │
│                                              │
│  Vue 3 SPA                                   │
│   ├─ Views (pages)                           │
│   ├─ Components (forms, lists, calendar)     │
│   ├─ Store (single reactive state object)    │
│   ├─ Units module (conversion math)          │
│   └─ Persistence (load/save localStorage,    │
│                   export/import JSON)         │
│                                              │
│  localStorage:  "gomasak.v1" → { …state… }   │
└─────────────────────────────────────────────┘
```

**Principles**
- **Single source of truth:** one reactive state object, mirrored to localStorage.
- **Centralized unit math:** prep aggregation and cooking deduction call the same
  conversion functions (cross-cutting requirement from the stories).
- **No silent server assumptions:** time-based rules are computed on the client at
  load/render time, not by a cron.
- **Keep it small:** prefer Vue's built-in reactivity and a hand-rolled store over
  heavy libraries. Pinia optional but not required.

### 2.1 GitHub Pages constraints (must-follow)

1. **`base` path:** Set `base: '/<repo-name>/'` in `vite.config.js` so asset URLs
   resolve under the Pages subpath.
2. **Hash routing:** Use `createWebHashHistory` (URLs like `/#/recipes`). Pages has
   no server rewrites, so history-mode deep links 404 on refresh. Hash routing
   avoids this with zero config.
3. **Static only:** No environment secrets, no runtime config fetch. Everything
   ships in the bundle.

---

## 3. Tech Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Build | Vite | Outputs static `index.html` + hashed JS/CSS assets. |
| Framework | Vue 3 (`<script setup>`) | Composition API. |
| Routing | `vue-router` (hash mode) | Required for GitHub Pages. |
| State | Single reactive store module | `reactive()` + persistence wrapper. Pinia optional. |
| Styling | Plain CSS or a light utility setup | Mobile-first; designer's choice. |
| Persistence | `localStorage` | One key, whole-state JSON. |
| ID generation | `crypto.randomUUID()` | Client-side unique IDs. |
| Dates | Native `Date` / ISO `YYYY-MM-DD` strings | No date library required for MVP. |
| Deploy | GitHub Actions → Pages, or `gh-pages` branch | Build artifact = `dist/`. |

---

## 4. Data Model (client)

The `User` entity, `pin`, and all `user_id` fields are removed. Entities are stored
as keyed maps (object by id) inside one state object.

```ts
// Conceptual shapes (plain JS objects at runtime).

AppState {
  version: number              // schema version, for future migrations
  ingredients: Ingredient[]
  stock: StockEntry[]          // 0..1 per ingredient
  recipes: Recipe[]
  mealPlans: MealPlan[]
}

Ingredient {
  id: string
  name: string
  defaultUnit?: string         // optional
}

StockEntry {
  ingredientId: string
  qty: number
  unit: string                 // a single stored qty+unit per ingredient
}

Recipe {
  id: string
  title: string
  servingSize: number          // positive
  steps: string                // multi-line instruction body
  ingredients: RecipeIngredient[]
  trashed: boolean             // soft-delete flag
}

RecipeIngredient {
  ingredientId: string
  qty: number | null           // null = non-quantifiable ("to taste")
  unit: string                 // "secukupnya" allowed for to-taste
}

MealPlan {
  id: string
  date: string                 // ISO YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipeId: string
  servingSizeOverride: number | null
  status: 'Planned' | 'Cooked' | 'NotCooked'
  cookedSnapshot?: CookedSnapshot   // frozen at cook time (see §7.3)
}

CookedSnapshot {
  // Frozen copy of what was deducted, so Cooked meals are immune to later
  // recipe edits and remain auditable.
  title: string
  servingSize: number          // effective serving used
  lines: { ingredientId: string, qty: number|null, unit: string }[]
}
```

**Notes**
- Stock is keyed by `ingredientId` (max one entry per ingredient).
- A trashed recipe is retained while referenced by any meal plan; purged otherwise
  (see §6.5 / §8).
- `cookedSnapshot` is the mechanism that makes Cooked meals "frozen" while Planned
  meals stay live against recipe edits.

---

## 5. Persistence & Export/Import

### 5.1 localStorage
- **Key:** `gomasak.v1` (includes schema version).
- **Write:** Debounced save of the whole state object after any mutation.
- **Read:** On app boot. If absent/invalid, seed an empty state.
- **Quota:** localStorage (~5MB) is ample for this app's text data.

### 5.2 Export (new feature)
- **US-EX.1 — Export all data**
  - A menu action downloads the full `AppState` as a `.json` file
    (e.g. `gomasak-backup-YYYY-MM-DD.json`).
  - The file includes the schema `version`.

### 5.3 Import (new feature)
- **US-EX.2 — Import data**
  - A menu action accepts a previously exported `.json` file via a file picker.
  - On import, the file is validated (shape + version) and **replaces** current
    state after an explicit confirmation ("This will overwrite your current data").
  - Invalid/incompatible files are rejected with a clear message; current data is
    left untouched.
  - Decision for MVP: **replace** (not merge) — simplest and predictable.

---

## 6. Features (Epics)

> Epic 1 (Authentication) is dropped. Epic numbering below follows the original
> stories for traceability.

### Epic 2 — Recipe Management
- **US-2.1 Create recipe** — title, serving size (>0), ≥1 ingredient, steps body.
- **US-2.2 Add ingredients** — name (autocomplete from catalog, or type new → creates
  ingredient on save), qty, unit from fixed list; add/remove lines. "Secukupnya"
  (to-taste) lines have no qty.
- **US-2.3 View recipe** — title, serving, ingredient list, steps; mobile layout.
- **US-2.4 Edit recipe** — all fields editable. **Planned** meals reference the live
  recipe (see edits immediately); **Cooked** meals read their `cookedSnapshot` and
  are unaffected.
- **US-2.5 Trash recipe** — soft delete (`trashed = true`), hidden from list and new
  meal-plan selection, with confirmation. Retained while referenced; purged when not.
- **US-2.6 List recipes** — titles (+ serving optional); excludes trashed; tap → detail.

### Epic 3 — Ingredient Catalog & Stock
- **US-3.1 Implicit catalog** — new ingredient names from recipes are added; existing
  offered for reuse.
- **US-3.2 Stock page** — list ingredients with qty+unit; no-stock shows as zero/not stocked.
- **US-3.3 Add/modify stock** — set/adjust qty+unit; single qty+unit per ingredient;
  user may enter in any compatible unit (converted to stored unit on write); display
  in a chosen compatible unit on read; saves immediately.
- **US-3.4 Delete stock** — removes the stock record (ingredient definition may remain);
  confirmation prompt.

### Epic 4 — Meal Planning
- **US-4.1 Plan a meal** — pick recipe + date + meal type; multiple meals per date;
  defaults to `Planned`.
- **US-4.2 Serving override** — defaults to recipe serving; when overridden, quantities
  scale `scaled = recipe_qty × override / recipe_serving`; reflected in prep & cooking.
- **US-4.3 Calendar** — defaults to **weekly**; user freely sets window length; meals
  grouped by date + meal type; each shows title, serving (+override), status.
- **US-4.5 Auto NotCooked** — Planned meals with a past date auto-become `NotCooked`
  (computed on load/render, see §7.2); no stock deduction; visually distinct.
- **US-4.4 Edit/remove planned meal** — change recipe/date/type/override while Planned;
  delete allowed; cooking is one-way (no revert, no re-credit).

### Epic 5 — Ingredient Prep
- **US-5.1 Select meal plans** — multi-select (date range or checklist); spans dates/types;
  default scope = calendar window, freely widened/narrowed.
- **US-5.2 Aggregate needed** — sum per ingredient across selected meals (with overrides);
  convert+combine compatible units within a family; incompatible units → separate lines
  with a warning; to-taste listed without a number.
- **US-5.3 Inline stock adjust** — each row: name, needed, current stock (pre-filled,
  editable), shortfall = `max(0, needed − current_stock)` after conversion.
- **US-5.4 Persist from prep** — explicit **Save** (no auto-save per edit); updates saved
  stock; reopening reflects last saved stock.

### Epic 6 — Cooking & Stock Deduction
- **US-6.1 Mark Cooked** — explicit confirmation (irreversible); subtracts each ingredient
  qty (after scaling + conversion) from stock; stock floors at zero (no negative/debt);
  status → Cooked (one-way), visually distinct. Writes `cookedSnapshot`.
- **US-6.2 Stock reflects cooking** — stock page shows reduced qty; zeroed ingredients show 0.
- **Non-blocking shortfall notice** — "you were short X of ingredient Y" shown after cooking;
  does not block.

---

## 7. Cross-Cutting Logic

### 7.1 Units & Conversion (single module)
Implements the families and factors from the user stories §5:
- **Mass:** g, kg (`1 kg = 1000 g`).
- **Volume:** ml, l (`1 l = 1000 ml`), sdt (≈5 ml), sdm (≈15 ml), gelas (≈240 ml).
- **Count:** buah/pcs, butir, siung, lembar, potong, bungkus, kaleng, sachet, ikat —
  counted as-is, no cross-conversion.
- **To-taste:** `secukupnya` — display-only, excluded from aggregation/deduction.

Rules: aggregate within a family via a canonical unit, then display in a sensible unit;
different families = separate lines + mismatch flag. **Prep aggregation and cooking
deduction must call this same module** (consistency requirement).

### 7.2 Time-based rules (computed on load/render)
No cron. On app boot and when rendering the calendar/prep:
- Any `Planned` meal whose `date` < today → set to `NotCooked` (persisted).
- This is deterministic and idempotent.

### 7.3 Cooked snapshot (freeze)
On marking Cooked, capture a `cookedSnapshot` of the effective title/serving/lines used
for deduction. Cooked meals render from the snapshot and ignore later recipe edits/trashing.

### 7.4 Validation
- Quantities are positive numbers (except to-taste, which has none).
- Units must be from the fixed list and family-consistent per ingredient.
- Serving size > 0.

---

## 8. Trashed-Recipe Purge (client)
Computed lazily (on load and after meal-plan deletions):
- A recipe with `trashed = true` AND referenced by **no** meal plan is removed from state.
- A trashed recipe still referenced (e.g. by a Cooked meal's history) is retained.
- Because Cooked meals carry a `cookedSnapshot`, purging a trashed recipe never breaks
  the calendar/history display.

---

## 9. Routes (hash-based)

| Route | View | Notes |
|-------|------|-------|
| `/#/` | Dashboard / today | Landing. |
| `/#/recipes` | Recipe list | Excludes trashed. |
| `/#/recipes/new` | Recipe create | |
| `/#/recipes/:id` | Recipe detail | |
| `/#/recipes/:id/edit` | Recipe edit | |
| `/#/stock` | Stock page | CRUD. |
| `/#/calendar` | Meal plan calendar | Weekly default, adjustable window. |
| `/#/prep` | Ingredient prep | Select → aggregate → adjust → save. |
| `/#/settings` | Settings | Export / Import data. |

---

## 10. Build Order (MVP)

1. **Project skeleton** — Vite + Vue + vue-router (hash), `base` set for Pages,
   state store + localStorage persistence, empty-state seed.
2. **Units module** — families, conversion, aggregation helpers (with unit tests).
3. **Recipe CRUD + implicit ingredient catalog.**
4. **Stock page CRUD** (with on-read/on-write unit conversion).
5. **Meal planning** — calendar, meal types, serving override, auto-NotCooked.
6. **Ingredient prep** — aggregation, inline adjustable stock, shortfall, explicit save.
7. **Cooking** — mark Cooked, snapshot, floor-at-zero deduction, shortfall notice.
8. **Export / Import** — download JSON, import-with-confirm replace.
9. **Trashed-recipe purge** wired into load/delete paths.
10. **Deploy** — GitHub Actions build → Pages.

---

## 11. Out of Scope (this MVP)
- Authentication, multi-user, PINs, accounts (removed).
- Server/API, sync across devices except via manual export/import.
- Sharing/collaboration, recipe discovery/search marketplace, social.
- Nutrition, calories, cost/price/budget tracking.
- Merge-on-import, conflict resolution (import = replace).
- Offline service-worker/PWA install (can be a later enhancement).
