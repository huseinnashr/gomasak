<script setup>
import { ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import { exportState, importState } from '../stores/transfer.js'
import { todayISO } from '../lib/dates.js'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const store = useAppStore()
const message = ref('')
const error = ref('')
const pendingText = ref(null) // raw text awaiting import confirmation
const fileInput = ref(null)

function doExport() {
  exportState(store, todayISO())
  message.value = 'Backup downloaded.'
  error.value = ''
}

function onFile(event) {
  error.value = ''
  message.value = ''
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    pendingText.value = String(reader.result)
  }
  reader.onerror = () => {
    error.value = 'Could not read the file.'
  }
  reader.readAsText(file)
}

function confirmImport() {
  const result = importState(store, pendingText.value)
  pendingText.value = null
  if (fileInput.value) fileInput.value.value = ''
  if (result.ok) {
    message.value = 'Data imported and replaced.'
    error.value = ''
  } else {
    error.value = result.error
    message.value = ''
  }
}

function cancelImport() {
  pendingText.value = null
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <section>
    <h1>Settings</h1>

    <div class="card">
      <h3>Backup</h3>
      <p class="muted">Export your full data as a JSON file, or import a backup.</p>

      <div class="row-actions" style="margin-top: 12px">
        <button class="btn btn-primary" @click="doExport">Export data</button>
        <label class="btn">
          Import data
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            style="display: none"
            @change="onFile"
          />
        </label>
      </div>

      <p v-if="message" class="msg-ok">{{ message }}</p>
      <p v-if="error" class="error-text" style="margin-top: 12px">{{ error }}</p>
    </div>

    <ConfirmDialog
      :open="!!pendingText"
      title="Replace all current data?"
      message="Importing will overwrite your current data. This cannot be undone."
      confirm-label="Import & replace"
      danger
      @confirm="confirmImport"
      @cancel="cancelImport"
    />
  </section>
</template>

<style scoped>
.card h3 {
  margin-bottom: var(--space-2);
}
.msg-ok {
  margin-top: var(--space-3);
  color: var(--color-primary);
}
</style>
