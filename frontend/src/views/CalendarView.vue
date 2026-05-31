<script setup>
import { computed, reactive, ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import MealPlanForm from '../components/MealPlanForm.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { MEAL_TYPES } from '../lib/mealTypes.js'
import {
  todayISO,
  startOfWeekISO,
  addDaysISO,
  rangeISO,
  formatHuman,
} from '../lib/dates.js'

const store = useAppStore()

// Ensure past Planned meals are reconciled before rendering (plan 05 §7.2).
store.reconcilePastMeals()

// ---- Window controls (default weekly) ----
const WINDOWS = [
  { key: 'days', label: '3 days', span: 3 },
  { key: 'week', label: 'Week', span: 7 },
  { key: 'two', label: '2 weeks', span: 14 },
  { key: 'month', label: 'Month', span: 30 },
]
const windowKey = ref('week')
const anchor = ref(startOfWeekISO(todayISO()))

const windowSpan = computed(() => WINDOWS.find((w) => w.key === windowKey.value).span)
const windowStart = computed(() =>
  windowKey.value === 'week' ? startOfWeekISO(anchor.value) : anchor.value,
)
const windowEnd = computed(() => addDaysISO(windowStart.value, windowSpan.value - 1))
const days = computed(() => rangeISO(windowStart.value, windowEnd.value))

function shiftWindow(dir) {
  anchor.value = addDaysISO(anchor.value, dir * windowSpan.value)
}
function setWindow(key) {
  windowKey.value = key
  if (key === 'week') anchor.value = startOfWeekISO(anchor.value)
}

// ---- Meals grouped by date then meal type ----
function mealTitle(m) {
  if (m.status === 'Cooked' && m.cookedSnapshot) return m.cookedSnapshot.title
  return store.recipeById(m.recipeId)?.title ?? '(deleted recipe)'
}
function mealServing(m) {
  if (m.status === 'Cooked' && m.cookedSnapshot) return m.cookedSnapshot.servingSize
  const r = store.recipeById(m.recipeId)
  return r ? store.effectiveServing(m, r) : null
}

const mealsByDate = computed(() => {
  const map = {}
  for (const day of days.value) map[day] = []
  for (const m of store.mealPlans) {
    if (m.date in map) map[m.date].push(m)
  }
  // Order each day's meals by meal type.
  for (const day of days.value) {
    map[day].sort((a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType))
  }
  return map
})

// ---- Plan / edit dialog ----
const planning = reactive({ open: false, editId: null, initial: null })

function openPlan(date) {
  planning.editId = null
  planning.initial = { date }
  planning.open = true
}
function openEdit(m) {
  planning.editId = m.id
  planning.initial = {
    recipeId: m.recipeId,
    date: m.date,
    mealType: m.mealType,
    servingSizeOverride: m.servingSizeOverride,
  }
  planning.open = true
}
function submitPlan(input) {
  if (planning.editId) {
    store.updateMeal(planning.editId, input)
  } else {
    store.planMeal(input)
  }
  planning.open = false
}

// ---- Delete + Mark Cooked ----
const deleteTarget = ref(null)
const cookTarget = ref(null)
const shortfalls = ref(null) // non-blocking notice after cooking

function confirmDelete() {
  store.deleteMeal(deleteTarget.value)
  deleteTarget.value = null
}
function confirmCook() {
  const result = store.markCooked(cookTarget.value)
  cookTarget.value = null
  shortfalls.value = result.length ? result : null
}
</script>

<template>
  <section>
    <h1>Calendar</h1>

    <div class="controls">
      <div class="windows">
        <button
          v-for="w in WINDOWS"
          :key="w.key"
          class="btn btn-sm"
          :class="{ 'btn-primary': windowKey === w.key }"
          @click="setWindow(w.key)"
        >
          {{ w.label }}
        </button>
      </div>
      <div class="nav-window">
        <button class="btn btn-sm" @click="shiftWindow(-1)">‹</button>
        <span class="muted">{{ formatHuman(windowStart) }} – {{ formatHuman(windowEnd) }}</span>
        <button class="btn btn-sm" @click="shiftWindow(1)">›</button>
      </div>
    </div>

    <div class="days">
      <div v-for="day in days" :key="day" class="day card" :class="{ today: day === todayISO() }">
        <div class="day-head">
          <strong>{{ formatHuman(day) }}</strong>
          <button class="btn btn-sm" @click="openPlan(day)">+ Plan</button>
        </div>

        <p v-if="!mealsByDate[day].length" class="muted small">No meals.</p>

        <div v-for="m in mealsByDate[day]" :key="m.id" class="meal">
          <div class="meal-main">
            <span class="meal-type">{{ m.mealType }}</span>
            <span class="meal-title">{{ mealTitle(m) }}</span>
            <span class="muted small">serves {{ mealServing(m) }}</span>
          </div>
          <div class="meal-side">
            <span class="badge" :class="`badge-${m.status.toLowerCase()}`">{{ m.status }}</span>
            <div v-if="m.status === 'Planned'" class="row-actions">
              <button class="btn btn-sm btn-primary" @click="cookTarget = m.id">Cook</button>
              <button class="btn btn-sm" @click="openEdit(m)">Edit</button>
              <button class="btn btn-sm btn-danger" @click="deleteTarget = m.id">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Plan/edit dialog -->
    <div v-if="planning.open" class="overlay" @click.self="planning.open = false">
      <div class="dialog card">
        <h3>{{ planning.editId ? 'Edit meal' : 'Plan a meal' }}</h3>
        <MealPlanForm
          :initial="planning.initial"
          :submit-label="planning.editId ? 'Save' : 'Plan meal'"
          @submit="submitPlan"
          @cancel="planning.open = false"
        />
      </div>
    </div>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Remove this meal?"
      confirm-label="Remove"
      danger
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />

    <ConfirmDialog
      :open="!!cookTarget"
      title="Mark as cooked?"
      message="This deducts ingredients from stock and cannot be undone."
      confirm-label="Mark cooked"
      @confirm="confirmCook"
      @cancel="cookTarget = null"
    />

    <!-- Non-blocking shortfall notice (plan 07) -->
    <div v-if="shortfalls" class="notice" role="status">
      <div class="notice-head">
        <strong>Cooked — but stock was short:</strong>
        <button class="btn btn-sm" @click="shortfalls = null">Dismiss</button>
      </div>
      <ul>
        <li v-for="(s, i) in shortfalls" :key="i">
          {{ s.name }}: short {{ Math.round(s.short * 100) / 100 }} {{ s.unit }}
          <span v-if="s.note" class="muted">({{ s.note }})</span>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-3) 0 var(--space-4);
}
.windows {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.nav-window {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.days {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.day.today {
  border-color: var(--color-primary);
  border-width: 2px;
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.small {
  font-size: 0.8rem;
}
.meal {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border);
}
.meal-main {
  display: flex;
  flex-direction: column;
}
.meal-type {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--color-muted);
}
.meal-title {
  font-weight: 600;
}
.meal-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
}
.dialog {
  max-width: 440px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.dialog h3 {
  margin-bottom: var(--space-3);
}
.notice {
  position: fixed;
  left: var(--space-4);
  right: var(--space-4);
  bottom: calc(var(--nav-height) + var(--space-3));
  background: var(--color-warning-soft);
  border: 1px solid var(--color-warning);
  border-radius: var(--radius);
  padding: var(--space-3);
  z-index: 90;
  max-width: 720px;
  margin: 0 auto;
}
.notice-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.notice ul {
  margin: 0;
  padding-left: var(--space-4);
}
</style>
