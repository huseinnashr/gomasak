<script setup>
import { computed, reactive, ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import { todayISO } from '../lib/dates.js'
import { MEAL_TYPES } from '../lib/mealTypes.js'

// Create/edit form for a planned meal. Reused for both modes.
const props = defineProps({
  // { recipeId, date, mealType, servingSizeOverride }
  initial: { type: Object, default: null },
  submitLabel: { type: String, default: 'Plan meal' },
})
const emit = defineEmits(['submit', 'cancel'])

const store = useAppStore()
const recipes = computed(() => store.activeRecipes)

const form = reactive({
  recipeId: props.initial?.recipeId ?? '',
  date: props.initial?.date ?? todayISO(),
  mealType: props.initial?.mealType ?? 'lunch',
  servingSizeOverride: props.initial?.servingSizeOverride ?? '',
})

const error = ref('')

const selectedRecipe = computed(() => store.recipeById(form.recipeId))

function onSubmit() {
  if (!form.recipeId) {
    error.value = 'Pick a recipe.'
    return
  }
  if (!form.date) {
    error.value = 'Pick a date.'
    return
  }
  if (form.servingSizeOverride !== '' && !(Number(form.servingSizeOverride) > 0)) {
    error.value = 'Serving override must be greater than 0.'
    return
  }
  error.value = ''
  emit('submit', {
    recipeId: form.recipeId,
    date: form.date,
    mealType: form.mealType,
    servingSizeOverride: form.servingSizeOverride === '' ? null : Number(form.servingSizeOverride),
  })
}
</script>

<template>
  <form class="meal-form" @submit.prevent="onSubmit">
    <div class="field">
      <label>Recipe</label>
      <select v-model="form.recipeId" class="select">
        <option value="" disabled>Select a recipe</option>
        <option v-for="r in recipes" :key="r.id" :value="r.id">{{ r.title }}</option>
      </select>
    </div>

    <div class="field">
      <label>Date</label>
      <input v-model="form.date" class="input" type="date" />
    </div>

    <div class="field">
      <label>Meal type</label>
      <select v-model="form.mealType" class="select">
        <option v-for="t in MEAL_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>

    <div class="field">
      <label>
        Serving override
        <span v-if="selectedRecipe" class="muted">(default {{ selectedRecipe.servingSize }})</span>
      </label>
      <input
        v-model="form.servingSizeOverride"
        class="input"
        type="number"
        min="1"
        step="any"
        :placeholder="selectedRecipe ? String(selectedRecipe.servingSize) : 'default'"
      />
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div class="row-actions">
      <button type="submit" class="btn btn-primary">{{ submitLabel }}</button>
      <button type="button" class="btn" @click="emit('cancel')">Cancel</button>
    </div>
  </form>
</template>
