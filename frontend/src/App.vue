<script setup>
import { RouterLink, RouterView } from 'vue-router'

const navLinks = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/recipes', label: 'Recipes', icon: '📖' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/prep', label: 'Prep', icon: '🧺' },
  { to: '/stock', label: 'Stock', icon: '📦' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]
</script>

<template>
  <div class="app">
    <header class="app-header">
      <RouterLink to="/" class="brand">gomasak</RouterLink>
    </header>

    <main class="app-main">
      <RouterView />
    </main>

    <nav class="app-nav">
      <RouterLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="nav-item"
        :class="{ active: $route.path === link.to }"
      >
        <span class="nav-icon">{{ link.icon }}</span>
        <span class="nav-label">{{ link.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--nav-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  background: var(--color-primary);
  color: #fff;
}

.brand {
  font-weight: 700;
  font-size: 1.25rem;
  color: #fff;
  text-decoration: none;
  letter-spacing: 0.5px;
}

.app-main {
  flex: 1;
  padding: var(--space-4);
  padding-bottom: calc(var(--nav-height) + var(--space-5));
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.app-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 10;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-decoration: none;
  color: var(--color-muted);
  font-size: 0.7rem;
}

.nav-item.active {
  color: var(--color-primary);
  font-weight: 600;
}

.nav-icon {
  font-size: 1.2rem;
}

/* Wider viewports: nav becomes a left sidebar. */
@media (min-width: 760px) {
  .app {
    flex-direction: row;
  }
  .app-header {
    display: none;
  }
  .app-nav {
    position: sticky;
    top: 0;
    height: 100vh;
    width: 120px;
    flex-direction: column;
    border-top: none;
    border-right: 1px solid var(--color-border);
    padding-top: var(--space-4);
  }
  .nav-item {
    flex: 0 0 auto;
    padding: var(--space-3) 0;
    font-size: 0.8rem;
  }
  .app-main {
    padding-bottom: var(--space-5);
  }
}
</style>
