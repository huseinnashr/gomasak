# Gomasak — User Test Report

**Target:** https://huseinnashr.github.io/gomasak/ (live GitHub Pages build)
**Date:** 2026-05-31
**Viewport:** 390 × 844, mobile portrait, 3× DPI (iPhone-class)
**Driver:** Playwright + Chromium (`frontend_test/user-test.mjs`)
**Result:** ✅ All flows passed end-to-end. State exported for re-import.

The test seeds a fresh profile (localStorage cleared), then walks the MVP
epics in order. Authentication (Epic 1) is intentionally out of MVP scope.

## Coverage map

| # | Screenshot | Stories exercised |
|---|------------|-------------------|
| 01 | dashboard-empty | Empty-state seed, dashboard landing |
| 02 | recipe-form-filled | US-2.1, US-2.2 (title, serving, ingredient lines, units, to-taste, steps) |
| 03 | recipe-detail | US-2.3 (view recipe) |
| 04 | recipe-list | US-2.6 (browse recipes) |
| 05 | stock-page | US-3.2, US-3.3 (set qty+unit; cross-unit entry e.g. beras in kg) |
| 06 | plan-meal-dialog | US-4.1, US-4.2 (recipe + date + meal type; serving override → 4) |
| 07 | calendar-week | US-4.3 (weekly window), US-4.5 (past meal auto **NotCooked**) |
| 08 | prep-aggregation | US-5.1, US-5.2, US-5.3 (aggregate, unit conversion, shortfall, to-taste) |
| 09 | cook-confirm | US-6.1 (irreversible confirmation) |
| 10 | cook-shortfall-notice | US-6.1 (floor-at-zero), non-blocking shortfall notice |
| 11 | stock-after-cooking | US-6.2 (stock reflects cooking) |
| 12 | dashboard-today | Today's meals + Cooked/Planned badges, stat tiles |
| 13 | settings-export | US-EX.1 (export JSON backup) |

## Seeded data

- **Recipes (3):** Nasi Goreng Spesial (serves 2), Soto Ayam Kampung (serves 4), Es Teh Manis (serves 1).
- **Stock (4):** beras 1 kg, telur 4 butir, ayam 300 g, bawang putih 5 siung.
- **Meal plans (4):** today — Nasi Goreng (lunch, override 4 → **Cooked**), Soto Ayam (dinner), Es Teh (snack); Thu May 28 — Soto Ayam (lunch → **NotCooked**).

## Notable behaviours verified

- **Serving scaling:** Nasi Goreng override 2→4 doubled its needs (beras 600 g, telur 4 butir).
- **Unit conversion in prep:** air 240 ml + 1 l aggregated to **1.24 l**; kecap manis 2 sdm ×2 = **60 ml**.
- **Shortfall math:** ayam needed 500 g vs 300 g stock → **200 g** short (red); beras 600 g vs 1 kg → ✓.
- **Cooking deduction + floor-at-zero:** cooking Nasi Goreng emitted "short 1 siung bawang putih, 4 sdm kecap manis" without blocking.
- **To-taste:** garam (secukupnya) listed without a quantity and excluded from aggregation/deduction.

## Files

- `screenshots/01..13-*.png` — pitch-deck images.
- `data/gomasak-backup-2026-05-31.json` — the app's own export (import via **Settings → Import data**).
- `data/localStorage-gomasak.v1.json` — raw localStorage dump (cross-check; identical shape).

To re-import: open the live app → **Settings → Import data** → pick the backup JSON → confirm "Import & replace".
