<script setup>
import { reactive, ref } from 'vue'
import IngredientPicker from './IngredientPicker.vue'
import UnitSelect from './UnitSelect.vue'
import { isToTaste } from '../units/units.js'

// Recipe create/edit form. Emits a clean input object on valid submit.
const props = defineProps({
  // { title, servingSize, steps, ingredients: [{ name, qty, unit }] }
  initial: { type: Object, default: null },
  submitLabel: { type: String, default: 'Save' },
})
const emit = defineEmits(['submit'])

function blankLine() {
  return { name: '', qty: '', unit: '' }
}

const form = reactive({
  title: props.initial?.title ?? '',
  servingSize: props.initial?.servingSize ?? '',
  steps: props.initial?.steps ?? '',
  ingredients: props.initial?.ingredients?.map((l) => ({
    name: l.name,
    qty: l.qty == null ? '' : l.qty,
    unit: l.unit,
  })) ?? [blankLine()],
})

const errors = ref([])

function addLine() {
  form.ingredients.push(blankLine())
}
function removeLine(i) {
  form.ingredients.splice(i, 1)
  if (form.ingredients.length === 0) form.ingredients.push(blankLine())
}

// To-taste lines clear their quantity (qty disabled).
function onUnitChange(line) {
  if (isToTaste(line.unit)) line.qty = ''
}

function validate() {
  const errs = []
  if (!form.title.trim()) errs.push('Title is required.')
  if (!(Number(form.servingSize) > 0)) errs.push('Serving size must be greater than 0.')
  const lines = form.ingredients.filter((l) => l.name.trim())
  if (lines.length === 0) errs.push('At least one ingredient is required.')
  for (const l of lines) {
    if (!l.unit) {
      errs.push(`Pick a unit for "${l.name}".`)
      continue
    }
    if (!isToTaste(l.unit) && !(Number(l.qty) > 0)) {
      errs.push(`Quantity for "${l.name}" must be greater than 0.`)
    }
  }
  return errs
}

function onSubmit() {
  const errs = validate()
  errors.value = errs
  if (errs.length) return
  emit('submit', {
    title: form.title.trim(),
    servingSize: Number(form.servingSize),
    steps: form.steps,
    ingredients: form.ingredients
      .filter((l) => l.name.trim())
      .map((l) => ({
        name: l.name.trim(),
        qty: isToTaste(l.unit) ? null : Number(l.qty),
        unit: l.unit,
      })),
  })
}
</script>

<template>
  <form class="recipe-form" @submit.prevent="onSubmit">
    <div class="field">
      <label>Title</label>
      <input v-model="form.title" class="input" type="text" placeholder="Recipe title" />
    </div>

    <div class="field">
      <label>Serving size</label>
      <input v-model="form.servingSize" class="input" type="number" min="1" step="1" />
    </div>

    <div class="field">
      <label>Ingredients</label>
      <div
        v-for="(line, i) in form.ingredients"
        :key="i"
        class="ing-line"
      >
        <div class="ing-name">
          <IngredientPicker v-model="line.name" />
        </div>
        <input
          class="input ing-qty"
          type="number"
          min="0"
          step="any"
          placeholder="qty"
          v-model="line.qty"
          :disabled="isToTaste(line.unit)"
        />
        <div class="ing-unit">
          <UnitSelect v-model="line.unit" @update:modelValue="onUnitChange(line)" />
        </div>
        <button type="button" class="btn btn-sm" @click="removeLine(i)" aria-label="remove">
          ✕
        </button>
      </div>
      <button type="button" class="btn btn-sm" @click="addLine">+ Add ingredient</button>
    </div>

    <div class="field">
      <label>Steps</label>
      <textarea v-model="form.steps" class="textarea" placeholder="One step per line"></textarea>
    </div>

    <ul v-if="errors.length" class="errors">
      <li v-for="(e, i) in errors" :key="i" class="error-text">{{ e }}</li>
    </ul>

    <button type="submit" class="btn btn-primary">{{ submitLabel }}</button>
  </form>
</template>

<style scoped>
.ing-line {
  display: grid;
  grid-template-columns: 1fr 70px 110px auto;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  align-items: start;
}
.errors {
  margin: 0 0 var(--space-3);
  padding-left: var(--space-4);
}
</style>
