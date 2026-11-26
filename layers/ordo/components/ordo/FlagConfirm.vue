<script setup lang="ts">
import OrdoFlagText from './FlagText.vue'
import OrdoIcon from './Icon.vue'
import type { FlagConfirmRequest } from '../../composables/useFlagActions'
import { confirmationMatches } from '../../utils/flags'

// The confirmation of a write that touches many people, deletes or launches:
// what happens, to how many, and (when asked) the key typed. Only text: no
// alert icon, sound or animation. A centred dialog on a computer, a sheet
// from the bottom on a phone (portal.css).
const props = defineProps<{
  request: FlagConfirmRequest
  busy: boolean
  error: string | null
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const typed = ref('')
const uid = `flag-confirm-${Math.random().toString(36).slice(2, 8)}`
const dialog = ref<HTMLElement | null>(null)
watch(() => props.request, () => { typed.value = '' })

const matches = computed(() => !props.request.typed || confirmationMatches(typed.value, props.request.typed))
const canConfirm = computed(() => matches.value && !props.busy)

const confirm = () => {
  if (canConfirm.value) emit('confirm')
}

const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !props.busy) emit('cancel')
}

onMounted(() => {
  document.addEventListener('keydown', onKey)
  nextTick(() => {
    const target = dialog.value?.querySelector<HTMLElement>('input, .op-dialog__actions button:last-child')
    target?.focus()
  })
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="op-dialog-backdrop" @click.self="!busy && emit('cancel')">
    <div
      ref="dialog"
      class="op-dialog"
      :class="{ 'op-dialog--wide': request.kind === 'launch' }"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${uid}-title`"
      :data-confirm="request.kind"
    >
      <span class="op-dialog__grip" aria-hidden="true" />
      <div>
        <p v-if="request.eyebrow" class="op-eyebrow">{{ request.eyebrow }}</p>
        <h2 :id="`${uid}-title`" class="op-dialog__title"><OrdoFlagText :line="request.title" /></h2>
        <p v-if="request.lead" class="op-dialog__lead"><OrdoFlagText :line="request.lead" /></p>
      </div>

      <div v-if="request.note" class="op-inline-note op-inline-note--warn">
        <span><OrdoFlagText :line="request.note" /></span>
      </div>

      <div v-if="request.effects?.length" class="op-confirm">
        <strong>O que acontece</strong>
        <ul class="op-plain">
          <li v-for="(line, index) in request.effects" :key="index"><OrdoFlagText :line="line" /></li>
        </ul>
      </div>

      <div v-if="request.typed" class="op-confirm">
        <label :for="`${uid}-typed`">Para confirmar, digite <code>{{ request.typed }}</code></label>
        <div class="op-confirm__field">
          <input
            :id="`${uid}-typed`"
            v-model="typed"
            class="op-field op-field--mono"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            :disabled="busy"
            @keydown.enter.prevent="confirm"
          >
          <OrdoIcon v-if="matches && typed" name="check" :size="18" />
        </div>
      </div>

      <p v-if="error" class="op-inline-error" role="alert">{{ error }}</p>

      <div class="op-dialog__actions">
        <button type="button" class="op-btn op-btn--ghost" :disabled="busy" @click="emit('cancel')">{{ request.cancelLabel || 'Cancelar' }}</button>
        <button v-if="request.onSchedule" type="button" class="op-btn" :disabled="busy" @click="request.onSchedule()">{{ request.scheduleLabel || 'Agendar em vez disso' }}</button>
        <template v-if="request.choices">
          <button
            v-for="choice in request.choices"
            :key="choice.label"
            type="button"
            class="op-btn"
            :class="choice.tone === 'danger' ? 'op-btn--danger' : 'op-btn--primary'"
            :disabled="busy"
            @click="choice.onSelect()"
          >
            {{ choice.label }}
          </button>
        </template>
        <button
          v-if="request.run"
          type="button"
          class="op-btn"
          :class="request.tone === 'danger' ? 'op-btn--danger-solid' : 'op-btn--primary'"
          :disabled="!canConfirm"
          :aria-busy="busy || undefined"
          @click="confirm"
        >
          {{ busy ? 'Salvando…' : request.confirmLabel || 'Confirmar' }}
        </button>
      </div>
    </div>
  </div>
</template>
