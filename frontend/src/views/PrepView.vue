<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useAppStore } from '../stores/app.js'
import UnitSelect from '../components/UnitSelect.vue'
import { convert } from '../units/convert.js'
import { areCompatible } from '../units/units.js'
import {
  todayISO,
  startOfWeekISO,
  addDaysISO,
} from '../lib/dates.js'

const store = useAppStore()
store.reconcilePastMeals()

// ---- Selection: default = current weekly window, Planned meals only ----
// "What to buy" = meals still to cook, so we include only Planned by default.
const rangeStart = ref(startOfWeekISO(todayISO()))
const rangeEnd = ref(addDaysISO(startOfWeekISO(todayISO()), 6))

const candidateMeals = computed(() =>
  store.mealPlans
    .filter(
      (m) =>
        m.status === 'Planned' &&
        m.date >= rangeStart.value &&
        m.date <= rangeEnd.value,
    )
    .map((m) => ({
      id: m.id,
      date: m.date,
      mealType: m.mealType,
      title: store.recipeById(m.recipeId)?.title ?? '(deleted recipe)',
    }))
    .sort((a, b) => a.date.localeCompare(b.date)),
)

// Per-meal checklist; default all candidates selected.
const selected = reactive({})
watch(
  candidateMeals,
  (meals) => {
    for (const m of meals) {
      if (!(m.id in selected)) selected[m.id] = true
    }
  },
  { immediate: true },
)

const selectedIds = computed(() =>
  candidateMeals.value.filter((m) => selected[m.id]).map((m) => m.id),
)

// ---- Aggregation rows from the store (plan 06 §2) ----
const prepRows = computed(() => store.computePrep(selectedIds.value))

// ---- Editable current-stock buffer (NO auto-save; commit on Save) ----
const drafts = reactive({}) // ingredientId → { qty, unit }
const saveMsg = ref('')

watch(
  prepRows,
  (rows) => {
    for (const row of rows) {
      if (!(row.ingredientId in drafts)) {
        const entry = store.stockByIngredient(row.ingredientId)
        drafts[row.ingredientId] = entry
          ? { qty: entry.qty, unit: entry.unit }
          : { qty: '', unit: row.segments[0]?.displayUnit || '' }
      }
    }
  },
  { immediate: true },
)

// Shortfall for a segment given the row's current-stock draft.
function shortfallFor(row, segment) {
  const draft = drafts[row.ingredientId]
  if (!draft || draft.qty === '' || draft.unit === '') return null
  if (!areCompatible(segment.displayUnit, draft.unit)) return null
  let stockInSeg
  try {
    stockInSeg = convert(Number(draft.qty), draft.unit, segment.displayUnit)
  } catch {
    return null
  }
  const short = segment.displayQty - stockInSeg
  return short > 0 ? Math.round(short * 1000) / 1000 : 0
}

function round(n) {
  return Math.round(n * 1000) / 1000
}

// Explicit save: commit all buffered current-stock values (plan 06 §4).
function saveStock() {
  let count = 0
  for (const row of prepRows.value) {
    const draft = drafts[row.ingredientId]
    if (!draft || draft.qty === '' || draft.unit === '') continue
    try {
      store.setStock(row.ingredientId, Number(draft.qty), draft.unit)
      count++
    } catch {
      // skip invalid rows; keep going
    }
  }
  saveMsg.value = `Saved stock for ${count} ingredient${count === 1 ? '' : 's'}.`
}
</script>

<template>
  <section>
    <h1>Ingredient prep</h1>
    <p class="muted">Aggregated needs for selected Planned meals.</p>

    <div class="range card">
      <div class="field" style="margin: 0">
        <label>From</label>
        <input v-model="rangeStart" class="input" type="date" />
      </div>
      <div class="field" style="margin: 0">
        <label>To</label>
        <input v-model="rangeEnd" class="input" type="date" />
      </div>
    </div>

    <details class="card" style="margin-top: 12px">
      <summary>Meals ({{ selectedIds.length }}/{{ candidateMeals.length }} selected)</summary>
      <p v-if="!candidateMeals.length" class="muted">No Planned meals in range.</p>
      <label v-for="m in candidateMeals" :key="m.id" class="check">
        <input type="checkbox" v-model="selected[m.id]" />
        <span>{{ m.date }} · {{ m.mealType }} · {{ m.title }}</span>
      </label>
    </details>

    <p v-if="!prepRows.length" class="muted" style="margin-top: 16px">
      Nothing to prep for the current selection.
    </p>

    <table v-else class="prep-table">
      <thead>
        <tr>
          <th>Ingredient</th>
          <th>Needed</th>
          <th>Current stock</th>
          <th>Shortfall</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="row in prepRows" :key="row.ingredientId">
          <tr v-if="row.toTaste && !row.segments.length">
            <td>{{ row.name }}</td>
            <td class="muted">to taste</td>
            <td>—</td>
            <td>—</td>
          </tr>
          <tr
            v-for="(seg, i) in row.segments"
            :key="row.ingredientId + ':' + i"
          >
            <td>
              {{ row.name }}
              <span v-if="row.incompatible" class="warn-flag" title="mixed units">⚠</span>
              <span v-if="row.toTaste" class="muted small"> · also to taste</span>
            </td>
            <td>{{ round(seg.displayQty) }} {{ seg.displayUnit }}</td>
            <td>
              <div v-if="i === 0" class="stock-edit">
                <input
                  v-model="drafts[row.ingredientId].qty"
                  class="input"
                  type="number"
                  min="0"
                  step="any"
                />
                <UnitSelect v-model="drafts[row.ingredientId].unit" />
              </div>
              <span v-else class="muted">—</span>
            </td>
            <td>
              <template v-if="shortfallFor(row, seg) === null">
                <span class="muted" title="unit mismatch">n/a</span>
              </template>
              <template v-else-if="shortfallFor(row, seg) > 0">
                <span class="short">{{ shortfallFor(row, seg) }} {{ seg.displayUnit }}</span>
              </template>
              <template v-else>
                <span class="ok">✓</span>
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <div v-if="prepRows.length" class="save-bar">
      <button class="btn btn-primary" @click="saveStock">Save stock</button>
      <span v-if="saveMsg" class="muted">{{ saveMsg }}</span>
    </div>
  </section>
</template>

<style scoped>
.range {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.range .field {
  flex: 1;
}
.check {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-1) 0;
}
.prep-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--space-4);
  font-size: 0.9rem;
}
.prep-table th,
.prep-table td {
  text-align: left;
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}
.stock-edit {
  display: flex;
  gap: var(--space-1);
}
.stock-edit .input {
  width: 70px;
}
.short {
  color: var(--color-danger);
  font-weight: 600;
}
.ok {
  color: var(--color-primary);
}
.warn-flag {
  color: var(--color-warning);
}
.small {
  font-size: 0.75rem;
}
.save-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}
</style>
