// Gomasak user test — drives the live GitHub Pages build in a mobile portrait
// viewport, walks the full user flow (docs/user_flow.md) and every MVP feature,
// screenshots each for the pitch deck, and exports state as JSON for re-import.
import { chromium, devices } from 'playwright'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFile, mkdir } from 'node:fs/promises'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHOTS = join(__dirname, 'output', 'screenshots')
const DATA = join(__dirname, 'output', 'data')
// Override with GOMASAK_URL to test a local dev server, e.g.
//   GOMASAK_URL=http://localhost:5173/gomasak/ npm test
const BASE = process.env.GOMASAK_URL || 'https://huseinnashr.github.io/gomasak/'

// Mobile portrait: iPhone 12-ish, 2x for crisp-but-light slides.
const VIEWPORT = { width: 390, height: 844 }
const DSF = 2

let step = 0
async function shot(page, name) {
  step += 1
  const file = join(SHOTS, `${String(step).padStart(2, '0')}-${name}.png`)
  await page.screenshot({ path: file })
  console.log(`  📸 ${String(step).padStart(2, '0')}-${name}.png`)
}

// ---- Recipe form helper -------------------------------------------------
// Fills the recipe form (without submitting). Returns nothing.
async function fillRecipe(page, recipe) {
  await page.goto(`${BASE}#/recipes/new`)
  await page.getByPlaceholder('Recipe title').waitFor()
  await page.getByPlaceholder('Recipe title').fill(recipe.title)
  await page.locator('input[type="number"]').first().fill(String(recipe.serving))

  const addBtn = page.getByRole('button', { name: '+ Add ingredient' })
  for (let i = 1; i < recipe.ingredients.length; i++) await addBtn.click()

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i]
    const line = page.locator('.ing-line').nth(i)
    await line.getByPlaceholder('ingredient name').fill(ing.name)
    await line.locator('select').selectOption(ing.unit) // to-taste disables qty
    if (ing.qty != null) await line.locator('input.ing-qty').fill(String(ing.qty))
    await page.locator('label').filter({ hasText: 'Steps' }).click() // dismiss autocomplete
  }
  await page.locator('textarea').fill(recipe.steps)
}

// Creates a recipe and returns its id (from the resulting detail URL).
async function createRecipe(page, recipe) {
  await fillRecipe(page, recipe)
  await page.getByRole('button', { name: 'Create recipe' }).click()
  await page.getByRole('heading', { name: recipe.title }).waitFor()
  return page.url().split('/recipes/')[1]
}

// ---- Meal plan dialog helper -------------------------------------------
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

  const ids = {}
  for (const r of recipes) {
    if (r.title === 'Nasi Goreng Spesial') {
      await fillRecipe(page, r)
      await shot(page, 'recipe-form-filled') // US-2.1/2.2 create form
      await page.getByRole('button', { name: 'Create recipe' }).click()
      await page.getByRole('heading', { name: r.title }).waitFor()
      ids[r.title] = page.url().split('/recipes/')[1]
      await shot(page, 'recipe-detail') // US-2.3 view
    } else {
      ids[r.title] = await createRecipe(page, r)
    }
    console.log(`  ✓ created "${r.title}"`)
  }

  // US-2.2/US-3.1 — ingredient autocomplete from the catalog.
  await page.goto(`${BASE}#/recipes/new`)
  await page.getByPlaceholder('Recipe title').waitFor()
  const firstName = page.locator('.ing-line').first().getByPlaceholder('ingredient name')
  await firstName.click()
  await firstName.fill('ba')
  await page.locator('.suggestions li').first().waitFor()
  await shot(page, 'ingredient-autocomplete')

  // US-2.6 — recipe list (repertoire).
  await page.goto(`${BASE}#/recipes`)
  await page.getByText('Nasi Goreng Spesial').waitFor()
  await shot(page, 'recipe-list')

  // US-2.4 — edit recipe (populated form).
  await page.goto(`${BASE}#/recipes/${ids['Soto Ayam Kampung']}/edit`)
  await page.getByRole('heading', { name: 'Edit recipe' }).waitFor()
  await shot(page, 'recipe-edit')

  // US-2.5 — trash recipe (confirmation). Cancel to keep data intact.
  await page.goto(`${BASE}#/recipes/${ids['Es Teh Manis']}`)
  await page.getByRole('button', { name: 'Trash' }).click()
  await page.locator('.overlay').filter({ hasText: 'Trash this recipe?' }).waitFor()
  await shot(page, 'recipe-trash-confirm')
  await page.getByRole('button', { name: 'Cancel' }).click()

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
  for (let i = 0; i < stockSeed.length; i++) {
    const s = stockSeed[i]
    const row = page.locator('.card').filter({ hasText: s.name }).first()
    await row.getByRole('button', { name: /Add stock|Edit/ }).click()
    await row.locator('input[type="number"]').fill(String(s.qty))
    await row.locator('select').selectOption(s.unit)
    if (i === 0) await shot(page, 'stock-edit-inline') // US-3.3 inline edit (cross-unit kg)
    await row.getByRole('button', { name: 'Save' }).click()
    console.log(`  ✓ stock ${s.name} = ${s.qty} ${s.unit}`)
  }
  await shot(page, 'stock-page')

  // US-3.4 — delete stock (confirmation). Cancel to keep data.
  const berasRow = page.locator('.card').filter({ hasText: 'beras' }).first()
  await berasRow.getByRole('button', { name: 'Delete' }).click()
  await page.locator('.overlay').filter({ hasText: 'Delete this stock record?' }).waitFor()
  await shot(page, 'stock-delete-confirm')
  await page.getByRole('button', { name: 'Cancel' }).click()

  // ===== Epic 4 — Meal Planning =====
  console.log('▶ Epic 4 — Meal planning')
  await page.goto(`${BASE}#/calendar`)
  await page.locator('.day').first().waitFor()

  await planMeal(page, 'Sun, May 31', {
    recipe: 'Nasi Goreng Spesial',
    mealType: 'lunch',
    override: 4,
    screenshot: 'plan-meal-dialog', // US-4.1/4.2 plan + serving override
  })
  await planMeal(page, 'Sun, May 31', { recipe: 'Soto Ayam Kampung', mealType: 'dinner' })
  await planMeal(page, 'Sun, May 31', { recipe: 'Es Teh Manis', mealType: 'snack' })
  await planMeal(page, 'Thu, May 28', { recipe: 'Soto Ayam Kampung', mealType: 'lunch' }) // → NotCooked

  await page.reload() // reconcilePastMeals → past meal becomes NotCooked
  await page.locator('.day').first().waitFor()
  await shot(page, 'calendar-week') // US-4.3 weekly + US-4.5 NotCooked

  // US-4.3 — adjustable window (2 weeks).
  await page.getByRole('button', { name: '2 weeks' }).click()
  await page.locator('.day').first().waitFor()
  await shot(page, 'calendar-two-weeks')
  await page.getByRole('button', { name: 'Week', exact: true }).click()

  // ===== Epic 5 — Ingredient Prep =====
  console.log('▶ Epic 5 — Prep')
  await page.goto(`${BASE}#/prep`)
  await page.locator('.prep-table').waitFor()
  await shot(page, 'prep-aggregation') // US-5.1/5.2/5.3 aggregate + shortfall

  // US-5.4 — explicit Save of inline stock.
  await page.getByRole('button', { name: 'Save stock' }).click()
  await page.locator('.save-bar .muted').waitFor()
  await shot(page, 'prep-stock-saved')

  // ===== Epic 6 — Cooking & Stock Deduction =====
  console.log('▶ Epic 6 — Cooking')
  await page.goto(`${BASE}#/calendar`)
  await page.locator('.day').first().waitFor()
  const today = page.locator('.day').filter({ hasText: 'Sun, May 31' })
  const nasiMeal = today.locator('.meal').filter({ hasText: 'Nasi Goreng Spesial' })
  await nasiMeal.getByRole('button', { name: 'Cook' }).click()
  await page.locator('.overlay').filter({ hasText: 'Mark as cooked' }).waitFor()
  await shot(page, 'cook-confirm') // US-6.1 irreversible confirm
  await page.getByRole('button', { name: 'Mark cooked' }).click()
  await page.locator('.notice').waitFor()
  await shot(page, 'cook-shortfall-notice') // US-6.1 floor-at-zero + notice

  await page.goto(`${BASE}#/stock`)
  await page.locator('.list .card').first().waitFor()
  await shot(page, 'stock-after-cooking') // US-6.2 stock reflects cooking

  // ===== Dashboard =====
  console.log('▶ Dashboard')
  await page.goto(BASE)
  await page.getByText('Nasi Goreng Spesial').first().waitFor()
  await shot(page, 'dashboard-today')

  // ===== Settings — Export / Import =====
  console.log('▶ Settings — export/import')
  await page.goto(`${BASE}#/settings`)
  await page.getByRole('button', { name: 'Export data' }).waitFor()
  await shot(page, 'settings-export') // US-EX.1
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export data' }).click(),
  ])
  const exportPath = join(DATA, download.suggestedFilename())
  await download.saveAs(exportPath)
  console.log(`  ✓ exported ${download.suggestedFilename()}`)

  // US-EX.2 — import (replace-with-confirm). Re-imports the just-saved backup.
  await page.locator('input[type="file"]').setInputFiles(exportPath)
  await page.locator('.overlay').filter({ hasText: 'Replace all current data?' }).waitFor()
  await shot(page, 'import-confirm')
  await page.getByRole('button', { name: 'Import & replace' }).click()
  await page.getByText('Data imported and replaced.').waitFor()
  await shot(page, 'import-done')

  // Raw localStorage dump for cross-check.
  const raw = await page.evaluate(() => localStorage.getItem('gomasak.v1'))
  await writeFile(join(DATA, 'localStorage-gomasak.v1.json'), JSON.stringify(JSON.parse(raw), null, 2))

  await browser.close()
  console.log('\n✅ Done. Screenshots + data in frontend_test/output/')
}

main().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
