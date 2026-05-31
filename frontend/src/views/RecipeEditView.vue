<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import RecipeForm from '../components/RecipeForm.vue'
import { useAppStore } from '../stores/app.js'

const props = defineProps({ id: { type: String, required: true } })
const store = useAppStore()
const router = useRouter()

const recipe = computed(() => store.recipeById(props.id))

// Map stored RecipeIngredient (ingredientId) back to names the form expects.
const initial = computed(() => {
  if (!recipe.value) return null
  return {
    title: recipe.value.title,
    servingSize: recipe.value.servingSize,
    steps: recipe.value.steps,
    ingredients: recipe.value.ingredients.map((l) => ({
      name: store.ingredientById(l.ingredientId)?.name ?? '',
      qty: l.qty,
      unit: l.unit,
    })),
  }
})

function onSubmit(input) {
  store.updateRecipe(props.id, input)
  router.push(`/recipes/${props.id}`)
}
</script>

<template>
  <section v-if="recipe">
    <h1>Edit recipe</h1>
    <RecipeForm :initial="initial" submit-label="Save changes" @submit="onSubmit" />
  </section>
  <section v-else>
    <p class="muted">Recipe not found.</p>
  </section>
</template>
