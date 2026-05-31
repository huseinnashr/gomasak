## GoMasak

A mobile-first web app for individual home cooks to manage recipes, plan meals
on a calendar, track ingredient stock, and generate "what do I need to buy" prep
lists. When a planned meal is cooked, the app deducts the ingredients it used
from your stock, keeping inventory always current.

### What it does

- **Recipes** — capture recipes once (title, serving size, ingredients, steps)
  and reuse them in meal plans. Soft-delete (trash) keeps history intact.
- **Ingredient catalog & stock** — ingredients are remembered as you build
  recipes; track a single qty + unit per ingredient with conversion offered on
  read and write.
- **Meal planning** — plan multiple meals per day on a calendar (breakfast /
  lunch / dinner / snack), with optional per-meal serving-size overrides that
  auto-scale ingredient quantities. Past, uncooked plans auto-mark as
  *NotCooked*.
- **Ingredient prep** — select meal plans to total the ingredients you need,
  aggregated and unit-converted per ingredient, with adjustable current stock
  and resulting shortfall.
- **Cooking & stock deduction** — marking a meal *Cooked* (one-way, confirmed)
  subtracts its scaled ingredients from stock, flooring at zero and surfacing a
  non-blocking "you were short" notice.

### Units

Uses common Indonesian household units across mass, volume, and count families,
with automatic conversion between compatible units when aggregating (e.g.
`1 kg = 1000 g`, `1 sdm ≈ 15 ml`). Non-quantifiable "secukupnya" (to-taste)
ingredients are supported and excluded from aggregation.

### MVP architecture

The MVP is a **client-only, single-user** app — no backend, no authentication.

- **Stack:** Vue 3 + Vite, built to a static HTML/CSS/JS bundle.
- **Routing:** `vue-router` in hash mode (GitHub Pages friendly).
- **Persistence:** the entire app state is one JSON object in browser
  `localStorage` (key `gomasak.v1`).
- **Backup:** export all data to a JSON file and import it back to move between
  devices/browsers (import replaces current state).
- **Hosting:** GitHub Pages (static).

### Documentation

- [User stories](docs/user_stories.md) — product scope, personas, and
  acceptance criteria.
- [MVP feature spec](docs/mvp_feature_spec.md) — architecture, data model, and
  build order for the client-only MVP.
