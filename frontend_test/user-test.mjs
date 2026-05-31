// Gomasak user test — drives the live GitHub Pages build in a mobile portrait
// viewport, walks the user stories epic-by-epic, screenshots for the pitch deck,
// and exports the resulting state as JSON for manual re-import.
import { chromium, devices } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(__dirname, 'output', 'screenshots')
const DATA = join(__dirname, 'output', 'data')
const BASE = 'https://huseinnashr.github.io/gomasak/'

// Mobile portrait: iPhone 12-ish, crisp 3x for slides.
const VIEWPORT = { width: 390, height: 844 }
const DSF = 3

let step = 0
async function shot(page, name) {
  step += 1
  const file = join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file })
  console.log(`  📸 ${String(step).padStart(2, '0')}-${name}.png`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- Recipe form helper -------------------------------------------------
async function createRecipe(page, recipe) {
  await page.goto(`${BASE}#/recipes/new`)
  await page.getByPlaceholder('Recipe title').waitFor()
  await page.getByPlaceholder('Recipe title').fill(recipe.title)
  await page.locator('input[type="number"]').first().fill(String(recipe.serving))

  // Ensure enough ingredient lines (form starts with one).
  const addBtn = page.getByRole('button', { name: '+ Add ingredient' })
  for (let i = 1; i < recipe.ingredients.length; i++) await addBtn.click()

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i]
    const line = page.locator('.ing-line').nth(i)
    await line.getByPlaceholder('ingredient name').fill(ing.name)
    // Pick unit first; to-taste disables & clears qty.
    await line.locator('select').selectOption(ing.unit)
    if (ing.qty != null) await line.locator('input.ing-qty').fill(String(ing.qty))
    // Click the steps label area to dismiss any autocomplete dropdown.
    await page.locator('label').filter({ hasText: 'Steps' }).click()
  }

  await page.locator('textarea').fill(recipe.steps)
  return page
}

// ---- Meal plan dialog helper -------------------------------------------
// Opens the dialog for a day, fills it, optionally screenshots, then submits and
// waits for the overlay to detach so the next interaction isn't blocked.
async function planMeal(page, dayLabel, { recipe, mealType, override, screenshot }) {
  const dayCard = page.locator('.day').filter({ hasText: dayLabel })
  const planBtn = dayCard.getByRole('button', { name: '+ Plan' })
  await planBtn.scrollIntoViewIfNeeded()
  await planBtn.click()
  const dialog = page.locator('.dialog')
  await dialog.waitFor()
  await dialog.locator('select').first().selectOption({ label: recipe })
  await dialog.locator('select').nth(1).selectOption(mealType)
  if (override != null) await dialog.locator('input[type="number"]').fill(String(override))
  if (screenshot) await shot(page, screenshot)
  await dialog.getByRole('button', { name: 'Plan meal' }).click()
  await page.locator('.overlay').waitFor({ state: 'detached' })
}

async function main() {
  await mkdir(SHOTS, { recursive: true })
  await mkdir(DATA, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DSF,
    isMobile: true,
    hasTouch: true,
    userAgent: devices['iPhone 12'].userAgent,
    acceptDownloads: true,
  })
  const page = await context.newPage()

  console.log('▶ Boot + reset state')
  await page.goto(BASE)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByText('Today', { exact: false }).first().waitFor()
  await shot(page, 'dashboard-empty')

  // ===== Epic 2 — Recipe Management =====
  console.log('▶ Epic 2 — Recipes')
  const recipes = [
    {
      title: 'Nasi Goreng Spesial',
      serving: 2,
      steps:
        'Panaskan minyak, tumis bawang putih.\nMasukkan nasi dan telur, aduk rata.\nTambah kecap manis dan garam, aduk hingga matang.',
      ingredients: [
        { name: 'beras', qty: 300, unit: 'g' },
        { name: 'telur', qty: 2, unit: 'butir' },
        { name: 'bawang putih', qty: 3, unit: 'siung' },
        { name: 'kecap manis', qty: 2, unit: 'sdm' },
        { name: 'garam', qty: null, unit: 'secukupnya' },
      ],
    },
    {
      title: 'Soto Ayam Kampung',
      serving: 4,
      steps:
        'Rebus ayam hingga empuk, suwir.\nTumis bumbu halus dan bawang merah.\nMasukkan ke kaldu, didihkan, beri garam.',
      ingredients: [
        { name: 'ayam', qty: 500, unit: 'g' },
        { name: 'bawang merah', qty: 5, unit: 'siung' },
        { name: 'air', qty: 1, unit: 'l' },
        { name: 'garam', qty: null, unit: 'secukupnya' },
      ],
    },
    {
      title: 'Es Teh Manis',
      serving: 1,
      steps: 'Seduh teh dengan air panas.\nTambahkan gula, aduk.\nSajikan dengan es.',
      ingredients: [
        { name: 'teh', qty: 1, unit: 'sachet' },
        { name: 'gula', qty: 2, unit: 'sdm' },
        { name: 'air', qty: 240, unit: 'ml' },
      ],
    },
  ]

  for (const r of recipes) {
    await createRecipe(page, r)
    if (r.title === 'Nasi Goreng Spesial') await shot(page, 'recipe-form-filled')
    await page.getByRole('button', { name: 'Create recipe' }).click()
    await page.getByRole('heading', { name: r.title }).waitFor()
    if (r.title === 'Nasi Goreng Spesial') await shot(page, 'recipe-detail')
    console.log(`  ✓ created "${r.title}"`)
  }

  await page.goto(`${BASE}#/recipes`)
  await page.getByText('Nasi Goreng Spesial').waitFor()
  await shot(page, 'recipe-list')

  // ===== Epic 3 — Stock =====
  console.log('▶ Epic 3 — Stock')
  await page.goto(`${BASE}#/stock`)
  await page.locator('.list .card').first().waitFor()
  const stockSeed = [
    { name: 'beras', qty: 1, unit: 'kg' },
    { name: 'telur', qty: 4, unit: 'butir' },
    { name: 'ayam', qty: 300, unit: 'g' },
    { name: 'bawang putih', qty: 5, unit: 'siung' },
  ]
  for (const s of stockSeed) {
    const row = page.locator('.card').filter({ hasText: s.name }).first()
    await row.getByRole('button', { name: /Add stock|Edit/ }).click()
    await row.locator('input[type="number"]').fill(String(s.qty))
    await row.locator('select').selectOption(s.unit)
    await row.getByRole('button', { name: 'Save' }).click()
    console.log(`  ✓ stock ${s.name} = ${s.qty} ${s.unit}`)
  }
  await shot(page, 'stock-page')

  // ===== Epic 4 — Meal Planning =====
  console.log('▶ Epic 4 — Meal planning')
  await page.goto(`${BASE}#/calendar`)
  await page.locator('.day').first().waitFor()

  // Nasi Goreng today, lunch, scaled to 4 servings — screenshot the dialog.
  await planMeal(page, 'Sun, May 31', {
    recipe: 'Nasi Goreng Spesial',
    mealType: 'lunch',
    override: 4,
    screenshot: 'plan-meal-dialog',
  })
  await planMeal(page, 'Sun, May 31', { recipe: 'Soto Ayam Kampung', mealType: 'dinner' })
  await planMeal(page, 'Sun, May 31', { recipe: 'Es Teh Manis', mealType: 'snack' })
  // A past-dated meal to showcase auto NotCooked (earlier this week).
  await planMeal(page, 'Thu, May 28', { recipe: 'Soto Ayam Kampung', mealType: 'lunch' })

  await page.reload() // trigger reconcilePastMeals → past meal becomes NotCooked
  await page.locator('.day').first().waitFor()
  await shot(page, 'calendar-week')

  // ===== Epic 5 — Ingredient Prep =====
  console.log('▶ Epic 5 — Prep')
  await page.goto(`${BASE}#/prep`)
  await page.locator('.prep-table').waitFor()
  await shot(page, 'prep-aggregation')

  // ===== Epic 6 — Cooking & Stock Deduction =====
  console.log('▶ Epic 6 — Cooking')
  await page.goto(`${BASE}#/calendar`)
  await page.locator('.day').first().waitFor()
  const today = page.locator('.day').filter({ hasText: 'Sun, May 31' })
  const nasiMeal = today.locator('.meal').filter({ hasText: 'Nasi Goreng Spesial' })
  await nasiMeal.getByRole('button', { name: 'Cook' }).click()
  await page.locator('.dialog, [role="dialog"]').filter({ hasText: 'Mark as cooked' }).waitFor()
  await shot(page, 'cook-confirm')
  await page.getByRole('button', { name: 'Mark cooked' }).click()
  await page.locator('.notice').waitFor()
  await shot(page, 'cook-shortfall-notice')

  await page.goto(`${BASE}#/stock`)
  await page.locator('.list .card').first().waitFor()
  await shot(page, 'stock-after-cooking')

  // ===== Dashboard with today's meals =====
  console.log('▶ Dashboard')
  await page.goto(BASE)
  await page.getByText('Nasi Goreng Spesial').first().waitFor()
  await shot(page, 'dashboard-today')

  // ===== Settings — Export JSON =====
  console.log('▶ Settings — export')
  await page.goto(`${BASE}#/settings`)
  await page.getByRole('button', { name: 'Export data' }).waitFor()
  await shot(page, 'settings-export')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export data' }).click(),
  ])
  const exportPath = join(DATA, download.suggestedFilename())
  await download.saveAs(exportPath)
  console.log(`  ✓ exported ${download.suggestedFilename()}`)

  // Also dump raw localStorage for cross-check.
  const raw = await page.evaluate(() => localStorage.getItem('gomasak.v1'))
  await writeFile(join(DATA, 'localStorage-gomasak.v1.json'), JSON.stringify(JSON.parse(raw), null, 2))

  await browser.close()
  console.log('\n✅ Done. Screenshots + data in frontend_test/output/')
}

main().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
