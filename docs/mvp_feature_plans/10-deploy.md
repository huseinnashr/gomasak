# 10 — Deploy to GitHub Pages

**Covers:** MVP spec §2.1, §10.10 — finalize `base`, build, deploy via GitHub Actions.
**Depends on:** all prior plans (ships the built app).
**Milestone:** M5 (live).

---

## Scope

Finalize the GitHub Pages `base` path, add a CI build that publishes `dist/` to
Pages, and verify the deployed static SPA works (hash routing, assets, localStorage).

---

## Pre-req (resolved)

- **Repo name = `gomasak`** (already pushed to GitHub). Therefore:
  - `frontend/vite.config.js`: `base: '/gomasak/'` (or `VITE_BASE=/gomasak/` in CI).
  - Live URL: `https://<user>.github.io/gomasak/#/`.
  - localStorage key stays `gomasak.v1` (unaffected by base).
- **Build context:** CI runs in `frontend/` (where `package.json` lives); publish
  `frontend/dist/`.

---

## Tasks

1. **Confirm `base`**
   - `base: '/gomasak/'`. Verify `npm run build` + `npm run preview` (run in
     `frontend/`) loads assets under the subpath.
2. **GitHub Actions workflow** (`.github/workflows/deploy.yml`)
   - Trigger on push to default branch.
   - Steps: checkout → setup-node 24 → `npm ci` → `npm run test` → `npm run build`
     (all with `working-directory: frontend`) → upload `frontend/dist/` artifact →
     deploy to Pages (`actions/deploy-pages`).
   - Set `VITE_BASE=/gomasak/` in the build step if using env-driven base.
3. **Pages settings**
   - Enable GitHub Pages → "GitHub Actions" source (or `gh-pages` branch fallback).
4. **Post-deploy verification**
   - Visit the Pages URL; hash routes navigate and survive refresh (no 404).
   - Assets load under the subpath; no console errors.
   - localStorage persists; export/import round-trip works on the live site.

---

## Files Introduced

`.github/workflows/deploy.yml`; final `base` in `vite.config.js`.

---

## Acceptance Criteria

- CI builds (tests green) and publishes to Pages on push to default branch.
- Live app loads at `https://<user>.github.io/<repo-name>/#/` with working routes.
- Hash deep links refresh without 404; assets resolve; no runtime errors.

---

## Risks / Notes

- Forgetting `base` is the classic Pages failure (blank page / 404 assets) — verify
  with `npm run preview` before pushing.
- Static-only: no secrets, no runtime config fetch (spec §2.1).
- PWA/offline is explicitly out of scope (MVP §11).
