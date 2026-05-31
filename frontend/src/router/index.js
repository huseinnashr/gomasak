import { createRouter, createWebHashHistory } from 'vue-router'

import DashboardView from '../views/DashboardView.vue'
import RecipeListView from '../views/RecipeListView.vue'
import RecipeNewView from '../views/RecipeNewView.vue'
import RecipeDetailView from '../views/RecipeDetailView.vue'
import RecipeEditView from '../views/RecipeEditView.vue'
import StockView from '../views/StockView.vue'
import CalendarView from '../views/CalendarView.vue'
import PrepView from '../views/PrepView.vue'
import SettingsView from '../views/SettingsView.vue'

// Hash mode so GitHub Pages deep-links survive refresh without server config.
const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/recipes', name: 'recipes', component: RecipeListView },
  { path: '/recipes/new', name: 'recipe-new', component: RecipeNewView },
  { path: '/recipes/:id', name: 'recipe-detail', component: RecipeDetailView, props: true },
  { path: '/recipes/:id/edit', name: 'recipe-edit', component: RecipeEditView, props: true },
  { path: '/stock', name: 'stock', component: StockView },
  { path: '/calendar', name: 'calendar', component: CalendarView },
  { path: '/prep', name: 'prep', component: PrepView },
  { path: '/settings', name: 'settings', component: SettingsView },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
