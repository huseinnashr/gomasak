# Gomasak — User Test Report

**Target:** https://huseinnashr.github.io/gomasak/ (live GitHub Pages build)
**Date:** 2026-05-31
**Viewport:** 390 × 844, mobile portrait, 2× DPI (iPhone-class)
**Driver:** Playwright + Chromium (`frontend_test/user-test.mjs`)
**Result:** ✅ All flows passed end-to-end. State exported for re-import.

The test seeds a fresh profile (localStorage cleared), then walks the full user
flow (`docs/user_flow.md`) and exercises **every MVP feature**. Authentication
(Epic 1) is intentionally out of MVP scope.

## Coverage map (22 screenshots)

| # | Screenshot | Feature / story |
|---|------------|-----------------|
| 01 | dashboard-empty | Empty-state seed, dashboard landing |
| 02 | recipe-form-filled | US-2.1/2.2 create form (title, serving, lines, units, to-taste, steps) |
| 03 | recipe-detail | US-2.3 view recipe |
| 04 | ingredient-autocomplete | US-2.2/3.1 catalog autocomplete ("ba" → bawang putih/merah) |
| 05 | recipe-list | US-2.6 browse repertoire |
| 06 | recipe-edit | US-2.4 edit (pre-filled form) |
| 07 | recipe-trash-confirm | US-2.5 soft-delete confirmation |
| 08 | stock-edit-inline | US-3.3 inline edit, cross-unit entry (beras in kg) |
| 09 | stock-page | US-3.2 stock list |
| 10 | stock-delete-confirm | US-3.4 delete-stock confirmation |
| 11 | plan-meal-dialog | US-4.1/4.2 plan + serving override → 4 |
| 12 | calendar-week | US-4.3 weekly window, US-4.5 auto **NotCooked** |
| 13 | calendar-two-weeks | US-4.3 adjustable window |
| 14 | prep-aggregation | US-5.1/5.2/5.3 aggregate, unit conversion, shortfall, to-taste |
| 15 | prep-stock-saved | US-5.4 explicit Save action |
| 16 | cook-confirm | US-6.1 irreversible confirmation |
| 17 | cook-shortfall-notice | US-6.1 floor-at-zero + non-blocking notice |
| 18 | stock-after-cooking | US-6.2 stock reflects cooking |
| 19 | dashboard-today | Today's meals + Cooked/Planned badges, stat tiles |
| 20 | settings-export | US-EX.1 export JSON backup |
| 21 | import-confirm | US-EX.2 import → replace confirmation |
| 22 | import-done | US-EX.2 import success |

## Seeded scenario

- **Recipes (3):** Nasi Goreng Spesial (serves 2), Soto Ayam Kampung (serves 4), Es Teh Manis (serves 1).
- **Stock (4):** beras 1 kg, telur 4 butir, ayam 300 g, bawang putih 5 siung.
- **Meal plans (4):** today — Nasi Goreng (lunch, override 4 → **Cooked**), Soto Ayam (dinner), Es Teh (snack); Thu May 28 — Soto Ayam (lunch → **NotCooked**).

## Notable behaviours verified

- **Serving scaling:** Nasi Goreng override 2→4 doubled needs (beras 600 g, telur 4 butir).
- **Unit conversion in prep:** air 240 ml + 1 l → **1.24 l**; kecap manis 2 sdm ×2 = **60 ml**.
- **Shortfall math:** ayam 500 g needed vs 300 g stock → **200 g** short (red); beras 600 g vs 1 kg → ✓.
- **Cooking deduction + floor-at-zero:** cooking Nasi Goreng emitted "short 1 siung bawang putih, 4 sdm kecap manis" without blocking.
- **To-taste:** garam (secukupnya) listed without a quantity, excluded from aggregation/deduction.
- **Backup round-trip:** export → re-import (replace) succeeds with the validated schema.

## Files

- `screenshots/01..22-*.png` — pitch-deck images (mobile portrait).
- `poster.png` — problem→flow→solution poster (built by `build-poster.mjs`).
- `data/gomasak-backup-2026-05-31.json` — the app's own export (import via **Settings → Import data**).
- `data/localStorage-gomasak.v1.json` — raw localStorage dump (cross-check).

To re-import: open the live app → **Settings → Import data** → pick the backup JSON → confirm "Import & replace".
