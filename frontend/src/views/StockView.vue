<script setup>
import { computed, reactive, ref } from 'vue'
import { useAppStore } from '../stores/app.js'
import UnitSelect from '../components/UnitSelect.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const store = useAppStore()

// Per-row local edit buffers keyed by ingredientId so editing one row doesn't
// disturb others. Seeded lazily from saved stock.
const drafts = reactive({})
const editing = ref(null) // ingredientId currently being edited
const deleteTarget = ref(null)
const message = ref('')

const rows = computed(() => store.listStockRows())

function startEdit(row) {
  drafts[row.ingredientId] = {
    qty: row.stocked ? row.qty : '',
    unit: row.unit || '',
  }
  editing.value = row.ingredientId
  message.value = ''
}

function cancelEdit() {
  editing.value = null
}

function save(row) {
  const draft = drafts[row.ingredientId]
  try {
    store.setStock(row.ingredientId, Number(draft.qty), draft.unit)
    editing.value = null
    message.value = `Saved ${row.name}.`
  } catch (err) {
    message.value = err.message
  }
}

function confirmDelete() {
  store.deleteStock(deleteTarget.value)
  deleteTarget.value = null
}
</script>

<template>
  <section>
    <h1>Stock</h1>
    <p class="muted">Set what you have on hand. Enter any compatible unit.</p>

    <p v-if="message" class="msg">{{ message }}</p>

    <p v-if="!rows.length" class="muted" style="margin-top: 16px">
      No ingredients yet — add them via recipes first.
    </p>

    <ul class="list">
      <li v-for="row in rows" :key="row.ingredientId" class="card">
        <div class="row-top">
          <span class="name">{{ row.name }}</span>
          <span v-if="editing !== row.ingredientId" class="qty">
            <template v-if="row.stocked">{{ row.qty }} {{ row.unit }}</template>
            <span v-else class="muted">0 / not stocked</span>
          </span>
        </div>

        <div v-if="editing === row.ingredientId" class="edit">
          <input
            v-model="drafts[row.ingredientId].qty"
            class="input"
            type="number"
            min="0"
            step="any"
          />
          <UnitSelect v-model="drafts[row.ingredientId].unit" />
          <button class="btn btn-primary btn-sm" @click="save(row)">Save</button>
          <button class="btn btn-sm" @click="cancelEdit">Cancel</button>
        </div>

        <div v-else class="row-actions">
          <button class="btn btn-sm" @click="startEdit(row)">
            {{ row.stocked ? 'Edit' : 'Add stock' }}
          </button>
          <button
            v-if="row.stocked"
            class="btn btn-danger btn-sm"
            @click="deleteTarget = row.ingredientId"
          >
            Delete
          </button>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      :open="!!deleteTarget"
      title="Delete this stock record?"
      message="The ingredient stays in your catalog; only its stock entry is removed."
      confirm-label="Delete"
      danger
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    />
  </section>
</template>

<style scoped>
.list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
.row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}
.name {
  font-weight: 600;
}
.edit {
  display: grid;
  grid-template-columns: 1fr 120px auto auto;
  gap: var(--space-2);
  align-items: center;
}
.msg {
  background: var(--color-primary-soft);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  margin: var(--space-3) 0;
}
</style>
