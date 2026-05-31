<script setup>
// Lightweight confirmation gate used for trash/delete/cook/import (§4).
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Are you sure?' },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
  danger: { type: Boolean, default: false },
})
const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="open" class="overlay" @click.self="emit('cancel')">
    <div class="dialog card" role="dialog" aria-modal="true">
      <h3>{{ title }}</h3>
      <p v-if="message" class="muted">{{ message }}</p>
      <div class="row-actions" style="justify-content: flex-end; margin-top: 16px">
        <button class="btn" @click="emit('cancel')">Cancel</button>
        <button
          class="btn"
          :class="danger ? 'btn-danger' : 'btn-primary'"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  z-index: 100;
}
.dialog {
  max-width: 400px;
  width: 100%;
}
.dialog h3 {
  margin-bottom: var(--space-2);
}
</style>
