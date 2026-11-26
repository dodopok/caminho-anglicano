<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import { flagErrorText } from '../../composables/useFlagActions'
import type { FlagsApi } from '../../composables/useFlagsApi'
import { isNotDeployed } from '../../composables/useReport'
import type { AdminUserMatch } from '../../types/flags'

// Finds a person by name or e-mail (GET /admin/users?q=, at least 3 letters,
// up to 20) for "Adicionar" and "Testar uma pessoa". Names and e-mails only
// show here, inside one flag, never in lists or rankings.
const props = withDefaults(defineProps<{
  api: FlagsApi
  label: string
  placeholder?: string
  actionLabel: string
  /** Ids already in the flag: shown, but not offered again. */
  taken?: number[]
  disabled?: boolean
}>(), { placeholder: 'Nome ou e-mail', taken: () => [], disabled: false })

const emit = defineEmits<{ pick: [person: AdminUserMatch] }>()

const term = ref('')
const results = ref<AdminUserMatch[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searched = ref('')
const input = ref<HTMLInputElement | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
let generation = 0

const search = async (value: string) => {
  const current = ++generation
  loading.value = true
  error.value = null
  try {
    const answer = await props.api.searchUsers(value)
    if (current !== generation) return
    results.value = answer.users || []
    searched.value = value
  } catch (failure) {
    if (current !== generation) return
    results.value = []
    error.value = isNotDeployed(failure) ? 'A busca de pessoas ainda não chegou à API.' : flagErrorText(failure)
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(term, (value) => {
  if (timer) clearTimeout(timer)
  const trimmed = value.trim()
  if (trimmed.length < 3) {
    generation += 1
    results.value = []
    searched.value = ''
    loading.value = false
    error.value = null
    return
  }
  timer = setTimeout(() => search(trimmed), 300)
})
onBeforeUnmount(() => { if (timer) clearTimeout(timer) })

const pick = (person: AdminUserMatch) => {
  emit('pick', person)
  term.value = ''
}

defineExpose({ focus: () => input.value?.focus() })
</script>

<template>
  <div class="op-col" style="gap: 8px">
    <label class="op-search">
      <span class="op-sr-only">{{ label }}</span>
      <OrdoIcon name="search" :size="18" />
      <input ref="input" v-model="term" class="op-field" type="search" :placeholder="placeholder" autocomplete="off" :disabled="disabled">
    </label>
    <p v-if="term.trim().length > 0 && term.trim().length < 3" class="op-note">Digite pelo menos 3 letras.</p>
    <p v-else-if="loading" class="op-note">Procurando…</p>
    <p v-else-if="error" class="op-note" role="alert">{{ error }}</p>
    <p v-else-if="searched && !results.length" class="op-note">Ninguém com "{{ searched }}".</p>
    <ul v-if="results.length" class="op-mlist">
      <li v-for="person in results" :key="person.id">
        <div class="op-mlist__copy" style="cursor: default">
          <strong>{{ person.name || 'Sem nome' }}</strong>
          <small>{{ person.email }}<template v-if="person.premium_active"> · Ordo+</template></small>
        </div>
        <span v-if="taken.includes(person.id)" class="op-pill op-pill--quiet">já está</span>
        <button v-else type="button" class="op-btn op-btn--small" :disabled="disabled" @click="pick(person)">{{ actionLabel }}</button>
      </li>
    </ul>
  </div>
</template>
