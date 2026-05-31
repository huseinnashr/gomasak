<script setup>
import { computed, ref } from 'vue'
import { useAppStore } from '../stores/app.js'

// Free-text ingredient name input with suggestions from the catalog.
// Returns a name (resolved to an id at save time, plan 03).
const props = defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const store = useAppStore()
const focused = ref(false)

const suggestions = computed(() => {
  const q = props.modelValue.trim().toLowerCase()
  if (!q) return []
  return store.ingredients
    .filter((i) => i.name.toLowerCase().includes(q) && i.name.toLowerCase() !== q)
    .slice(0, 6)
})

function pick(name) {
  emit('update:modelValue', name)
  focused.value = false
}
</script>

<template>
  <div class="picker">
    <input
      class="input"
      type="text"
      placeholder="ingredient name"
      :value="modelValue"
      @input="emit('update:modelValue', $event.target.value)"
      @focus="focused = true"
      @blur="focused = false"
    />
    <ul v-if="focused && suggestions.length" class="suggestions">
      <!-- mousedown fires before blur so the pick registers -->
      <li v-for="s in suggestions" :key="s.id" @mousedown.prevent="pick(s.name)">
        {{ s.name }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.picker {
  position: relative;
}
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  list-style: none;
  padding: 0;
  margin: 2px 0 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
  z-index: 20;
  max-height: 200px;
  overflow-y: auto;
}
.suggestions li {
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
}
.suggestions li:hover {
  background: var(--color-primary-soft);
}
</style>
