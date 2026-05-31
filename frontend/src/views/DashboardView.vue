<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAppStore } from '../stores/app.js'
import { todayISO } from '../lib/dates.js'

const store = useAppStore()

const todaysMeals = computed(() =>
  store.mealPlans
    .filter((m) => m.date === todayISO())
    .map((m) => ({
      ...m,
      title:
        m.status === 'Cooked' && m.cookedSnapshot
          ? m.cookedSnapshot.title
          : store.recipeById(m.recipeId)?.title ?? '(deleted recipe)',
    })),
)

const stats = computed(() => ({
  recipes: store.activeRecipes.length,
  planned: store.mealPlans.filter((m) => m.status === 'Planned').length,
  stocked: store.stock.length,
}))
</script>

<template>
  <section>
    <h1>Today</h1>
    <p class="muted">{{ todayISO() }}</p>

    <div v-if="todaysMeals.length" class="card" style="margin-top: 16px">
      <div v-for="m in todaysMeals" :key="m.id" class="today-meal">
        <span>{{ m.title }}</span>
        <span class="badge" :class="`badge-${m.status.toLowerCase()}`">{{ m.status }}</span>
      </div>
    </div>
    <p v-else class="muted" style="margin-top: 16px">No meals planned for today.</p>

    <div class="stats">
      <RouterLink to="/recipes" class="stat card">
        <strong>{{ stats.recipes }}</strong><span>Recipes</span>
      </RouterLink>
      <RouterLink to="/calendar" class="stat card">
        <strong>{{ stats.planned }}</strong><span>Planned</span>
      </RouterLink>
      <RouterLink to="/stock" class="stat card">
        <strong>{{ stats.stocked }}</strong><span>In stock</span>
      </RouterLink>
    </div>

    <div class="quick">
      <RouterLink to="/recipes/new" class="btn btn-primary">+ New recipe</RouterLink>
      <RouterLink to="/calendar" class="btn">Plan a meal</RouterLink>
      <RouterLink to="/prep" class="btn">Prep ingredients</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.today-meal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-border);
}
.today-meal:last-child {
  border-bottom: none;
}
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: var(--color-text);
}
.stat strong {
  font-size: 1.6rem;
  color: var(--color-primary);
}
.stat span {
  font-size: 0.8rem;
  color: var(--color-muted);
}
.quick {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
