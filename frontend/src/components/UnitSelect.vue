<script setup>
import { listUnits } from '../units/units.js'

// Grouped unit dropdown sourced from the units module (single source of truth).
defineProps({
  modelValue: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const groups = listUnits()
const FAMILY_LABELS = {
  mass: 'Mass',
  volume: 'Volume',
  count: 'Count',
  toTaste: 'To taste',
}
</script>

<template>
  <select
    class="select"
    :value="modelValue"
    @change="emit('update:modelValue', $event.target.value)"
  >
    <option value="" disabled>unit</option>
    <optgroup
      v-for="group in groups"
      :key="group.family"
      :label="FAMILY_LABELS[group.family] || group.family"
    >
      <option v-for="u in group.units" :key="u" :value="u">{{ u }}</option>
    </optgroup>
  </select>
</template>
