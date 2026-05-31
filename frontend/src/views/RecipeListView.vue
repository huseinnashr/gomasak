<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAppStore } from '../stores/app.js'

const store = useAppStore()
const recipes = computed(() => store.activeRecipes)
</script>

<template>
  <section>
    <div class="head">
      <h1>Recipes</h1>
      <RouterLink to="/recipes/new" class="btn btn-primary btn-sm">+ New</RouterLink>
    </div>

    <p v-if="!recipes.length" class="muted">No recipes yet. Create your first one.</p>

    <ul v-else class="list">
      <li v-for="r in recipes" :key="r.id">
        <RouterLink :to="`/recipes/${r.id}`" class="row card">
          <span class="title">{{ r.title }}</span>
          <span class="muted">serves {{ r.servingSize }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}
.list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  color: var(--color-text);
}
.title {
  font-weight: 600;
}
</style>
