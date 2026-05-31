# 08 — Export / Import (Backup)

**Covers:** MVP spec §5.2/§5.3 — US-EX.1 (export), US-EX.2 (import = replace).
**Depends on:** 01 (store, persistence, schema version).
**Milestone:** M4.

---

## Scope

Settings-page actions to export the full `AppState` to a `.json` file and import a
previously exported file, validating it and **replacing** current state after
explicit confirmation. This is the only cross-device move path (no sync).

---

## Tasks

1. **Export (US-EX.1)**
   - `exportState()` → serialize whole `AppState` (incl. `version`) to a Blob;
     trigger download named `gomasak-backup-YYYY-MM-DD.json` (date via `dates.js`).
2. **Import (US-EX.2)**
   - File picker accepts `.json`.
   - `validateImport(obj)`:
     - parse JSON (reject on parse error);
     - check shape: required keys (`version`, `ingredients`, `stock`, `recipes`,
       `mealPlans`) and array types;
     - check `version` compatibility (equal to current schema `version`; if older,
       either reject or migrate — MVP: require equal, reject otherwise with clear
       message).
   - On valid + **confirmation** ("This will overwrite your current data"):
     replace state in place and persist.
   - On invalid/incompatible: reject with a clear message; **leave current data
     untouched**.
   - MVP policy: **replace**, not merge.
3. **Settings view** (`SettingsView.vue`, `/#/settings`)
   - Export button; Import file input + confirm dialog; result/error messaging.

---

## Files Introduced

`src/views/SettingsView.vue`, `exportState` / `importState` / `validateImport`
helpers (in `src/store/persistence.js` or a `src/store/transfer.js`).

---

## Acceptance Criteria

- US-EX.1: menu action downloads full state as dated `.json` including `version`.
- US-EX.2: import validates shape+version; replaces state only after explicit
  confirm; invalid/incompatible files rejected with clear message and no data loss.
- Round-trip: export → fresh browser → import reproduces identical state.

---

## Tests

- `validateImport` accepts a well-formed current-version blob.
- Rejects: malformed JSON, missing keys, wrong types, mismatched version.
- Import replaces (not merges) and persists; rejected import leaves state unchanged.

---

## Risks / Notes

- Keep `version` authoritative; this is the foundation for any future migrations.
- Reuse the same empty-state shape from plan 01 to validate against.
