// Builds output/poster.png — a one-page problem→flow→solution poster for the
// pitch deck. Renders an HTML layout (problems, the happy-path flow with phone
// screenshots, the H-2 insight, the flow↔problem map) and screenshots it.
// Structure follows docs/user_problem.md + docs/user_flow.md.
import { chromium } from 'playwright'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { readdir, writeFile } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'output')
const SHOTS = join(OUT, 'screenshots')

// Resolve a screenshot by its descriptive suffix, independent of numeric prefix.
async function pick(suffix) {
  const files = await readdir(SHOTS)
  const f = files.find((n) => n.endsWith(`${suffix}.png`))
  if (!f) throw new Error(`screenshot not found: *${suffix}.png`)
  return `screenshots/${f}`
}

const STEPS = [
  {
    n: '1', when: 'Anytime', screen: 'Recipes',
    img: 'recipe-list', solves: 'Solves P2',
    why: 'Capture each dish once — the list becomes your living menu. Blank on what to cook? Browse it.',
  },
  {
    n: '2', when: '~H-7', screen: 'Calendar',
    img: 'calendar-week', solves: 'Sets up P1 & P3',
    why: 'Lay out the week: recipe + date + meal type, with optional serving scaling. Missed plans auto-mark NotCooked.',
  },
  {
    n: '3', when: 'H-2', screen: 'Prep', hero: true,
    img: 'prep-aggregation', solves: 'Solves P3 → P1',
    why: 'Auto-sums every ingredient across chosen meals (scaling + unit conversion) and subtracts stock → exact shortfall.',
  },
  {
    n: '4', when: 'H', screen: 'Cook',
    img: 'cook-shortfall-notice', solves: 'Closes P1',
    why: 'Mark cooked → ingredients auto-deduct (floored at zero). A non-blocking notice flags anything you ran short on.',
  },
  {
    n: '5', when: 'H', screen: 'Stock',
    img: 'stock-after-cooking', solves: 'Keeps it honest',
    why: 'Stock instantly reflects what you cooked, so the next Prep starts from the truth. The loop self-corrects.',
  },
]

const PROBLEMS = [
  { tag: 'P1', title: 'Missing ingredient on cook day',
    body: '"I plan a meal, but on the day I cook it, some ingredient is missing." Too late to shop.' },
  { tag: 'P2', title: 'Forgetting what I can cook',
    body: '"I forget the list of meals I know how to make," so deciding what to cook stalls.' },
  { tag: 'P3', title: 'Tedious ingredient math',
    body: '"Across several meals it\'s slow, error-prone work to total what I need vs. what I have."' },
]

async function main() {
  const steps = []
  for (const s of STEPS) steps.push({ ...s, src: await pick(s.img) })

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root{ --green:#2e8b57; --green-d:#1f6b41; --ink:#1c2b22; --muted:#5b6b62;
         --bg:#f4f6f5; --soft:#e7f1ec; --amber:#f5b301; --amber-soft:#fff7e0;
         --red:#cf3b3b; --line:#d9e2dd; }
  html,body{ background:#fff; }
  body{ width:1180px; font-family:'Segoe UI',system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif; color:var(--ink); }
  .poster{ padding:40px 44px 34px; }
  .head{ display:flex; align-items:baseline; gap:16px; border-bottom:3px solid var(--green); padding-bottom:14px; }
  .brand{ font-size:40px; font-weight:800; color:var(--green); letter-spacing:.5px; }
  .tagline{ font-size:19px; color:var(--muted); font-weight:500; }
  .section-label{ font-size:13px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;
                  color:var(--green-d); margin:26px 0 12px; }
  /* Problems */
  .problems{ display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
  .problem{ background:var(--bg); border:1px solid var(--line); border-left:5px solid var(--red);
            border-radius:10px; padding:16px 18px; }
  .problem .ptag{ display:inline-block; background:var(--red); color:#fff; font-weight:700; font-size:12px;
                  padding:2px 9px; border-radius:20px; margin-bottom:8px; }
  .problem h3{ font-size:17px; margin-bottom:6px; }
  .problem p{ font-size:13.5px; color:var(--muted); line-height:1.45; }
  /* Insight band */
  .insight{ margin-top:22px; background:var(--amber-soft); border:1px solid var(--amber);
            border-radius:12px; padding:16px 20px; display:flex; gap:14px; align-items:center; }
  .insight .k{ font-size:30px; }
  .insight b{ color:var(--green-d); }
  .insight p{ font-size:15.5px; line-height:1.5; }
  /* Flow */
  .flow{ display:grid; grid-template-columns:repeat(5,1fr); gap:14px; align-items:start; }
  .step{ background:#fff; border:1px solid var(--line); border-radius:14px; padding:12px 12px 14px;
         position:relative; }
  .step.hero{ border:2px solid var(--green); box-shadow:0 6px 18px rgba(46,139,87,.16); }
  .step .top{ display:flex; align-items:center; gap:8px; margin-bottom:8px; }
  .step .num{ width:26px; height:26px; border-radius:50%; background:var(--green); color:#fff;
              font-weight:800; font-size:14px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .step .screen{ font-weight:700; font-size:16px; }
  .step .when{ margin-left:auto; font-size:11px; font-weight:700; color:var(--green-d);
               background:var(--soft); padding:2px 8px; border-radius:20px; }
  .shot{ width:100%; border-radius:10px; border:1px solid var(--line); display:block; background:#fff; }
  .step .why{ font-size:12.5px; color:var(--muted); line-height:1.42; margin-top:9px; }
  .step .solves{ display:inline-block; margin-top:9px; font-size:11.5px; font-weight:700;
                 color:var(--green-d); background:var(--soft); padding:3px 9px; border-radius:20px; }
  .step.hero .solves{ background:var(--green); color:#fff; }
  .arrow{ position:absolute; right:-12px; top:46%; font-size:20px; color:var(--green); z-index:2; }
  /* Footer map */
  .foot{ margin-top:24px; display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
  .map{ background:var(--bg); border:1px solid var(--line); border-radius:10px; padding:12px 16px; }
  .map .mt{ font-weight:700; font-size:14px; color:var(--red); margin-bottom:3px; }
  .map .mb{ font-size:13px; color:var(--ink); line-height:1.4; }
  .loop{ text-align:center; font-size:13.5px; color:var(--muted); margin-top:18px; font-style:italic; }
  </style></head><body><div class="poster">

    <div class="head">
      <div class="brand">gomasak</div>
      <div class="tagline">From "what's for dinner?" to a cooked meal with honest stock.</div>
    </div>

    <div class="section-label">The problem · a home cook's 3 real pain points</div>
    <div class="problems">
      ${PROBLEMS.map((p) => `<div class="problem">
        <span class="ptag">${p.tag}</span>
        <h3>${p.title}</h3><p>${p.body}</p></div>`).join('')}
    </div>

    <div class="insight">
      <div class="k">⏱️</div>
      <p><b>The key idea — run Prep at H-2 (two days before cook day).</b> A shortfall you discover
      <i>on</i> cook day is too late to fix; the same shortfall found two days out is just a shopping
      order you place today, arriving with a day to spare.</p>
    </div>

    <div class="section-label">The flow that solves it · Recipes → Calendar → Prep → Cook → Stock</div>
    <div class="flow">
      ${steps.map((s, i) => `<div class="step ${s.hero ? 'hero' : ''}">
        <div class="top"><div class="num">${s.n}</div><div class="screen">${s.screen}</div>
          <div class="when">${s.when}</div></div>
        <img class="shot" src="${s.src}">
        <div class="why">${s.why}</div>
        <span class="solves">${s.solves}</span>
        ${i < steps.length - 1 ? '<div class="arrow">➜</div>' : ''}
      </div>`).join('')}
    </div>

    <div class="section-label">Flow ↔ problem map</div>
    <div class="foot">
      <div class="map"><div class="mt">P1 · Cook-day shortage</div>
        <div class="mb">Prep shortfall at H-2 (Step 3) + non-blocking cook-time notice (Step 4).</div></div>
      <div class="map"><div class="mt">P2 · Forgot what I can cook</div>
        <div class="mb">The recipe list is the living repertoire to browse (Step 1).</div></div>
      <div class="map"><div class="mt">P3 · Multi-meal math</div>
        <div class="mb">Auto-aggregation with scaling + unit conversion vs. stock (Step 3).</div></div>
    </div>
    <div class="loop">Cooking keeps stock honest (Step 5) → next Prep's shortfall is accurate (Step 3) → you never arrive at cook day short again.</div>

  </div></body></html>`

  const htmlPath = join(OUT, 'poster.html')
  await writeFile(htmlPath, html)

  const browser = await chromium.launch()
  // deviceScaleFactor 1 keeps the PNG light; the layout is already 1180px wide.
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  await page.goto(pathToFileURL(htmlPath).href)
  await page.waitForLoadState('networkidle')
  const poster = page.locator('.poster')
  await poster.screenshot({ path: join(OUT, 'poster.png') })
  await browser.close()
  console.log('✅ poster.png written to frontend_test/output/')
}

main().catch((err) => {
  console.error('❌ Poster build failed:', err)
  process.exit(1)
})
