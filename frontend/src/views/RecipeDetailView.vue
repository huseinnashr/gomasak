<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { isToTaste } from '../units/units.js'

const props = defineProps({ id: { type: String, required: true } })
const store = useAppStore()
const router = useRouter()

const recipe = computed(() => store.recipeById(props.id))
const showTrash = ref(false)

const lines = computed(() => {
  if (!recipe.value) return []
  return recipe.value.ingredients.map((l) => ({
    name: store.ingredientById(l.ingredientId)?.name ?? '(unknown)',
    qty: l.qty,
    unit: l.unit,
    toTaste: isToTaste(l.unit) || l.qty == null,
  }))
})

const stepLines = computed(() =>
  (recipe.value?.steps || '').split('\n').filter((s) => s.trim()),
)

function confirmTrash() {
  store.trashRecipe(props.id)
  showTrash.value = false
  router.push('/recipes')
}
</script>

<template>
  <section v-if="recipe">
    <div class="head">
      <h1>{{ recipe.title }}</h1>
      <span class="muted">serves {{ recipe.servingSize }}</span>
    </div>

    <h3>Ingredients</h3>
    <ul class="ing-list">
      <li v-for="(l, i) in lines" :key="i">
        <span>{{ l.name }}</span>
        <span class="muted">
          <template v-if="l.toTaste">secukupnya</template>
          <template v-else>{{ l.qty }} {{ l.unit }}</template>
        </span>
      </li>
    </ul>

    <h3 v-if="stepLines.length">Steps</h3>
    <ol v-if="stepLines.length" class="steps">
      <li v-for="(s, i) in stepLines" :key="i">{{ s }}</li>
    </ol>

    <div class="row-actions" style="margin-top: 24px">
      <RouterLink :to="`/recipes/${id}/edit`" class="btn btn-primary">Edit</RouterLink>
      <button class="btn btn-danger" @click="showTrash = true">Trash</button>
    </div>

    <ConfirmDialog
      :open="showTrash"
      title="Trash this recipe?"
      message="It will be hidden from your recipes and meal selection. Existing meals keep working."
      confirm-label="Trash"
      danger
      @confirm="confirmTrash"
      @cancel="showTrash = false"
    />
  </section>
  <section v-else>
    <p class="muted">Recipe not found.</p>
    <RouterLink to="/recipes" class="btn">Back to recipes</RouterLink>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.ing-list {
  list-style: none;
  padding: 0;
}
.ing-list li {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}
.steps {
  padding-left: var(--space-5);
}
.steps li {
  margin-bottom: var(--space-2);
}
</style>
