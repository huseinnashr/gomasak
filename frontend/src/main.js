import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { router } from './router/index.js'
import { useAppStore } from './stores/app.js'
import { load, start } from './stores/persistence.js'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

const store = useAppStore(pinia)

// Boot order (deterministic):
// 1. load persisted state
// 2. reconcile past Planned meals → NotCooked (plan 05)
// 3. purge unreferenced trashed recipes (plan 09) — after reconcile settles
load(store)
store.reconcilePastMeals()
store.purgeTrashedRecipes()

app.use(router)
app.mount('#app')

// Begin persisting mutations (debounced) after the initial boot writes settle.
start(store)
