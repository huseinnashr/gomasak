# gomasak — frontend

Vue 3 + Vite client-only meal planning & ingredient prep app. State lives in
`localStorage` (key `gomasak.v1`); no backend.

## Develop

```bash
npm install
npm run dev        # dev server
npm run test       # Vitest unit tests
npm run build      # production build → dist/
npm run preview    # serve the built dist/ under the /gomasak/ base
```

## Structure

- `src/units/` — unit families + conversion/aggregation (the single source of unit math)
- `src/stores/` — Pinia `app` store (all state + actions), persistence, export/import
- `src/lib/` — id, date, meal-type helpers
- `src/views/` — one per route (hash mode)
- `src/components/` — recipe/meal forms, pickers, dialogs

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs tests,
builds with `VITE_BASE=/gomasak/`, and publishes `dist/` to GitHub Pages.
Live URL: `https://<user>.github.io/gomasak/#/`.
