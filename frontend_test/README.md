# frontend_test — gomasak user-test harness

Playwright scripts that drive the live (or local) gomasak app in a **mobile
portrait** viewport, walk the full user flow + every MVP feature, capture
pitch-deck screenshots, export the resulting state as JSON, and build a
problem→flow→solution **poster**.

- Tests: [`user-test.mjs`](user-test.mjs) — 22 screenshots covering every epic.
- Poster: [`build-poster.mjs`](build-poster.mjs) — renders `output/poster.png`
  (structure from `docs/user_problem.md` + `docs/user_flow.md`).
- Output: `output/screenshots/*.png`, `output/data/*.json`,
  `output/poster.png`, `output/USER_TEST_REPORT.md`

## Run it in a fresh session

```bash
cd frontend_test
npm install            # installs Playwright + downloads Chromium (postinstall)
npm test               # 1) run the user test → screenshots + JSON export
npm run poster         # 2) build the poster from those screenshots
# or: npm run all      # both in sequence
```

`npm install` runs `playwright install chromium` automatically (postinstall), so
the browser binary is restored even though `node_modules/` is gitignored.

### First time on a new machine: system libraries

Chromium needs shared libs (libnspr4, libnss3, …) that aren't in npm. Once per
machine, with sudo:

```bash
npm run setup:deps     # = playwright install --with-deps chromium  (needs sudo)
```

If you can't use that, the equivalent apt one-liner:

```bash
sudo apt-get install -y libnspr4 libnss3 libasound2t64 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2
```

### Optional: emoji font (for clean nav icons in screenshots)

Headless Chromium ships no color-emoji font, so the bottom-nav icons render as
empty boxes without this. No sudo required:

```bash
mkdir -p ~/.local/share/fonts
curl -sL -o ~/.local/share/fonts/NotoColorEmoji.ttf \
  https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf
fc-cache -f
```

## Options

- **Target a local dev server** instead of GitHub Pages:
  ```bash
  GOMASAK_URL=http://localhost:5173/gomasak/ npm test
  ```

## Notes

- The script **clears localStorage** and seeds a fresh profile on each run, so it
  is idempotent — re-running overwrites `output/` with the same scenario.
- `node_modules/` is gitignored; everything needed to reproduce is in
  `package.json` + `package-lock.json` + the install steps above.
