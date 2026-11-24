<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import { ALL_TIME_START, rangeForPreset, type PeriodPreset, type PeriodValue } from '../../utils/period'

// Presets apply on click; a custom range applies when its dates are valid.
// The old panel only read the dates after "Aplicar", so the label and the
// numbers on screen could disagree.
const props = defineProps<{
  modelValue: PeriodValue
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: PeriodValue] }>()

const PRESETS: Array<{ id: Exclude<PeriodPreset, 'custom'>; label: string }> = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: '90d', label: '90 dias' },
  { id: '12m', label: '12 meses' },
  { id: 'all', label: 'Desde sempre' }
]

const open = ref(false)
const draftStart = ref(props.modelValue.start === ALL_TIME_START ? '' : props.modelValue.start)
const draftEnd = ref(props.modelValue.end)
const error = ref<string | null>(null)
const root = ref<HTMLElement | null>(null)

const formatShort = (value: string) => {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const rangeLabel = computed(() => props.modelValue.preset === 'all'
  ? `Todo o histórico até ${formatShort(props.modelValue.end)}`
  : `${formatShort(props.modelValue.start)} – ${formatShort(props.modelValue.end)}`)

const pick = (preset: Exclude<PeriodPreset, 'custom'>) => {
  open.value = false
  emit('update:modelValue', rangeForPreset(preset))
}

const applyCustom = () => {
  if (!draftStart.value || !draftEnd.value) {
    error.value = 'Escolha o início e o fim.'
    return
  }
  if (draftStart.value > draftEnd.value) {
    error.value = 'O início precisa vir antes do fim.'
    return
  }
  error.value = null
  open.value = false
  emit('update:modelValue', { preset: 'custom', start: draftStart.value, end: draftEnd.value })
}

watch(() => props.modelValue, value => {
  draftStart.value = value.start === ALL_TIME_START ? '' : value.start
  draftEnd.value = value.end
})

const onDocumentClick = (event: MouseEvent) => {
  if (open.value && root.value && !root.value.contains(event.target as Node)) open.value = false
}
const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="root" class="op-period">
    <div class="op-seg" role="group" aria-label="Período de leitura">
      <button
        v-for="preset in PRESETS"
        :key="preset.id"
        type="button"
        :class="{ 'is-on': modelValue.preset === preset.id }"
        :aria-pressed="modelValue.preset === preset.id"
        :disabled="disabled"
        @click="pick(preset.id)"
      >{{ preset.label }}</button>
    </div>
    <button type="button" class="op-period__range" :aria-expanded="open" aria-haspopup="dialog" @click="open = !open">
      <OrdoIcon name="calendar" :size="16" />
      <span>{{ modelValue.preset === 'custom' ? 'Personalizado: ' : '' }}{{ rangeLabel }}</span>
      <OrdoIcon name="chevron-down" :size="14" />
    </button>
    <div v-if="open" class="op-period__pop" role="dialog" aria-label="Escolher datas">
      <div class="op-period__dates">
        <label class="op-label">De<input v-model="draftStart" class="op-field" type="date" @keydown.enter="applyCustom"></label>
        <label class="op-label">Até<input v-model="draftEnd" class="op-field" type="date" @keydown.enter="applyCustom"></label>
      </div>
      <p v-if="error" class="op-period__error">{{ error }}</p>
      <p class="op-faint" style="margin: 0; font-size: 12.5px">As datas entram inteiras e seguem o fuso da API.</p>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <button type="button" class="op-btn op-btn--ghost op-btn--small" @click="open = false">Cancelar</button>
        <button type="button" class="op-btn op-btn--primary op-btn--small" @click="applyCustom">Usar estas datas</button>
      </div>
    </div>
  </div>
</template>
