<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoLocBadge from './LocBadge.vue'
import { useAudioStore } from '../../composables/useAudioStore'
import { OFFICE_META } from '../../utils/series'
import {
  compact,
  isDryRun,
  isWaiting,
  number,
  runBible,
  runCost,
  runOffices,
  runProgress,
  runStatus,
  runTime,
  runTitle,
  usd
} from '../../utils/audio'
import type { AudioRun } from '../../types/audio'

// One run in a list: what it is, where it stands, what it produced and, when
// something went wrong, the sentence that says so. The buttons a list needs
// (Cancelar, Tentar agora, Tentar de novo) come through the `actions` slot.
const props = withDefaults(defineProps<{
  run: AudioRun
  /** "hoje, 09:14 · 38 min" instead of "09:14 · levou 38 min" (lists without day headings). */
  withDay?: boolean
  selectable?: boolean
  selected?: boolean
  /** Office names in full ("Manhã, Meio-dia…") instead of "4 ofícios". */
  officeNames?: boolean
  showCost?: boolean
}>(), { withDay: false, selectable: false, selected: false, officeNames: false, showCost: true })

const emit = defineEmits<{ select: [run: AudioRun] }>()

const store = useAudioStore()
const status = computed(() => runStatus(props.run, { pendingCandidates: store.pendingCandidates.value }))
const progress = computed(() => runProgress(props.run))
const cost = computed(() => props.showCost ? runCost(props.run, store.price.value) : null)
const unit = computed(() => props.run.kind === 'generate_office' ? 'ofícios' : 'itens')

const meta = computed(() => {
  const run = props.run
  const out: Array<{ key: string; strong?: string; text: string }> = []
  const bible = runBible(run)
  const offices = runOffices(run)
  if (run.kind === 'generate_office') {
    const officeText = offices.length ? (props.officeNames ? offices.map(office => OFFICE_META[office]?.label || office).join(', ') : `${offices.length} ${offices.length === 1 ? 'ofício' : 'ofícios'}`) : ''
    const scope = [bible || 'Bíblia padrão', officeText].filter(Boolean).join(' · ')
    if (run.status === 'running' || isWaiting(run)) {
      if (progress.value !== null && run.total_items) out.push({ key: 'progress', strong: `${progress.value}%`, text: ` · ${number(run.processed_items)} de ${number(run.total_items)} ${unit.value}` })
      out.push({ key: 'scope', text: isWaiting(run) ? bible || 'Bíblia padrão' : scope })
      if (isWaiting(run)) out.push({ key: 'saved', text: `${number(run.generated_clips)} clips salvos` })
      else if (run.generated_clips) out.push({ key: 'clips', text: `${number(run.generated_clips)} clips novos · ${number(run.generated_characters)} caracteres` })
      return out
    }
    out.push({ key: 'scope', text: scope })
    if (run.status === 'failed') {
      if (run.total_items) out.push({ key: 'stopped', text: `parou em ${number(run.processed_items)} de ${number(run.total_items)} ${unit.value}` })
      if (run.generated_clips) out.push({ key: 'saved', strong: number(run.generated_clips), text: ` clips salvos · ${number(run.generated_characters)} caracteres` })
      return out
    }
    if (run.generated_clips || run.status === 'completed') out.push({ key: 'clips', strong: number(run.generated_clips), text: ` clips novos · ${number(run.generated_characters)} caracteres` })
    if (run.skipped_clips) out.push({ key: 'skipped', text: `${number(run.skipped_clips)} já existiam` })
    return out
  }
  if (run.kind === 'generate_catalog') {
    const translations = run.parameters?.translations
    const corpora = Array.isArray(translations) ? (translations.length ? `Textos, coletas e Bíblia ${translations.map(code => String(code).toUpperCase()).join(', ')}` : 'Só textos e coletas') : 'Textos, coletas e todas as Bíblias do idioma'
    out.push({ key: 'corpora', text: corpora })
    const result = run.result || {}
    if (isDryRun(run) && typeof result.missing_characters === 'number') {
      out.push({ key: 'missing', strong: compact(result.missing_characters), text: ` caracteres faltariam${Array.isArray(result.sources) ? ` em ${result.sources.length} fontes` : ''}` })
      out.push({ key: 'nothing', text: 'nada foi comprado' })
    } else if (run.generated_clips) out.push({ key: 'clips', strong: number(run.generated_clips), text: ` clips novos · ${number(run.generated_characters)} caracteres` })
    if ((run.status === 'running') && progress.value !== null) out.unshift({ key: 'progress', strong: `${progress.value}%`, text: '' })
    return out
  }
  if (run.kind === 'regenerate_clip') {
    const text = run.parameters?.text || run.result?.text
    if (typeof text === 'string' && text) out.push({ key: 'text', text: `“${text.length > 60 ? `${text.slice(0, 60)}…` : text}”` })
    const instructions = run.parameters?.additional_instructions
    if (typeof instructions === 'string' && instructions) out.push({ key: 'note', text: `observação: ${instructions}` })
    return out
  }
  if (run.kind === 'cleanup_clips') {
    out.push({ key: 'books', text: run.prayer_book_code ? store.bookName(run.prayer_book_code) : 'Todos os livros' })
    const removed = run.result?.deleted_clips ?? run.result?.removed_clips ?? run.processed_items
    if (typeof removed === 'number') out.push({ key: 'removed', strong: number(removed), text: ' clips e arquivos removidos' })
    return out
  }
  if (run.processed_items) out.push({ key: 'done', text: `${number(run.processed_items)} de ${number(run.total_items)} itens` })
  return out
})

const message = computed(() => {
  if (isWaiting(props.run)) return { tone: 'warn', text: props.run.error_message || 'O provedor de voz não respondeu; tenta de novo sozinha.' }
  if (props.run.status === 'failed' && props.run.error_message) {
    const saved = props.run.generated_clips ? ` Os ${number(props.run.generated_clips)} clips já gerados ficam e serão reaproveitados.` : ''
    return { tone: 'danger', text: `${props.run.error_message}${saved}` }
  }
  return null
})

const onSelect = () => {
  if (props.selectable) emit('select', props.run)
}
</script>

<template>
  <li
    class="op-run"
    :class="{ 'is-selectable': selectable, 'is-selected': selected }"
    :tabindex="selectable ? 0 : undefined"
    :aria-current="selected || undefined"
    @click="onSelect"
    @keydown.enter="onSelect"
  >
    <span class="op-run__icon" :class="`op-tone-${status.tone}`"><OrdoIcon :name="status.icon" :size="16" /></span>
    <div class="op-run__main">
      <div class="op-run__title">
        {{ runTitle(run) }}
        <OrdoLocBadge :code="run.prayer_book_code" />
        <span class="op-pill" :class="`op-pill--${status.tone}`">{{ status.label }}</span>
      </div>
      <div v-if="(run.status === 'running' || isWaiting(run)) && progress !== null && run.total_items" class="op-progress" :class="{ 'op-progress--striped': isWaiting(run) }">
        <span :style="{ width: `${progress}%` }" />
      </div>
      <div v-if="meta.length" class="op-run__meta">
        <span v-for="item in meta" :key="item.key"><b v-if="item.strong">{{ item.strong }}</b>{{ item.text }}</span>
      </div>
      <p v-if="message" class="op-run__msg" :class="`op-run__msg--${message.tone}`">{{ message.text }}</p>
      <slot name="below" />
    </div>
    <div class="op-run__side">
      <span class="op-run__time">{{ runTime(run, store.now.value, { withDay }) }}</span>
      <strong v-if="cost && !cost.estimated && run.status !== 'failed'" class="op-run__cost">{{ usd(cost.usd) }}</strong>
      <span v-else-if="cost?.estimated" class="op-faint" style="font-size: 13px">gerar custaria ≈ {{ usd(cost.usd) }}</span>
      <slot name="actions" />
    </div>
  </li>
</template>
