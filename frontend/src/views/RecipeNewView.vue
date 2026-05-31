<script setup>
import { useRouter } from 'vue-router'
import RecipeForm from '../components/RecipeForm.vue'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()
const router = useRouter()

function onSubmit(input) {
  const id = store.createRecipe(input)
  router.push(`/recipes/${id}`)
}
</script>

<template>
  <section>
    <h1>New recipe</h1>
    <RecipeForm submit-label="Create recipe" @submit="onSubmit" />
  </section>
</template>
