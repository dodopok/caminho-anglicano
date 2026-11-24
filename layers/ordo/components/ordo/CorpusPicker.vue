<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import type { AudioCatalogTranslation } from '../../types/dashboard'

// Which Bibles and psalters a whole-book run narrates. Each corpus is a card
// that says what it is ("NVI — Nova Versão Internacional"), the Bibles apart
// from the psalters, and "só textos" is a choice of its own rather than one
// more checkbox in the row: it means no Bible at all.
const props = defineProps<{
  corpora: AudioCatalogTranslation[]
  modelValue: string[]
  textsOnly: boolean
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [codes: string[]]
  'update:textsOnly': [value: boolean]
}>()

const groups = computed(() => {
  const bibles = props.corpora.filter(corpus => corpus.kind !== 'psalter')
  const psalters = props.corpora.filter(corpus => corpus.kind === 'psalter')
  return [
    { key: 'bible', title: 'Bíblias', hint: 'Leituras e salmos inteiros', items: bibles },
    { key: 'psalter', title: 'Saltérios', hint: 'Só os salmos', items: psalters }
  ].filter(group => group.items.length)
})

const selectedBibles = computed(() => props.corpora.filter(corpus => corpus.kind !== 'psalter' && props.modelValue.includes(corpus.code)).length)
const allSelected = computed(() => props.corpora.length > 0 && props.corpora.every(corpus => props.modelValue.includes(corpus.code)))

const toggle = (code: string) => {
  emit('update:textsOnly', false)
  emit('update:modelValue', props.modelValue.includes(code)
    ? props.modelValue.filter(item => item !== code)
    : [...props.modelValue, code])
}

const selectAll = () => {
  emit('update:textsOnly', false)
  emit('update:modelValue', props.corpora.map(corpus => corpus.code))
}

const clear = () => emit('update:modelValue', [])

const chooseTextsOnly = () => {
  const next = !props.textsOnly
  emit('update:textsOnly', next)
  if (next) emit('update:modelValue', [])
}

const subtitle = (corpus: AudioCatalogTranslation) => corpus.full_name && corpus.full_name !== corpus.name ? corpus.full_name : ''
// Psalters arrive named after their code ("IEAB_2015" for ieab_2015); the
// badge would only repeat the title, so such a name is spelled out instead.
const namedAfterCode = (corpus: AudioCatalogTranslation) => corpus.name.toLowerCase() === corpus.code.toLowerCase()
const title = (corpus: AudioCatalogTranslation) => namedAfterCode(corpus) ? corpus.code.replaceAll('_', ' ').toUpperCase() : corpus.name
</script>

<template>
  <fieldset class="corpus-picker">
    <legend class="corpus-picker__legend">
      <span>Bíblias e saltérios</span>
      <span v-if="corpora.length" class="corpus-picker__tools">
        <span class="corpus-picker__count">{{ textsOnly ? 'Nenhuma Bíblia' : modelValue.length ? `${modelValue.length} de ${corpora.length}` : 'Nenhum escolhido' }}</span>
        <button v-if="!allSelected && corpora.length > 1" type="button" class="op-link" @click="selectAll">Todas</button>
        <button v-if="modelValue.length" type="button" class="op-link" @click="clear">Limpar</button>
      </span>
    </legend>

    <div v-if="loading" class="corpus-picker__grid" aria-busy="true">
      <span v-for="n in 4" :key="n" class="op-skeleton" style="height: 58px" />
    </div>
    <p v-else-if="error" class="op-inline-error" style="margin: 0">Não foi possível carregar as Bíblias deste livro: {{ error }}</p>
    <template v-else>
      <section v-for="group in groups" :key="group.key" class="corpus-picker__group" :aria-label="group.title">
        <p class="corpus-picker__group-title">{{ group.title }} <span>· {{ group.hint }}</span></p>
        <div class="corpus-picker__grid">
          <button
            v-for="corpus in group.items"
            :key="corpus.code"
            type="button"
            role="checkbox"
            class="corpus-picker__card"
            :aria-checked="modelValue.includes(corpus.code)"
            :title="corpus.full_name || corpus.name"
            @click="toggle(corpus.code)"
          >
            <span class="corpus-picker__box" aria-hidden="true"><OrdoIcon v-if="modelValue.includes(corpus.code)" name="check" :size="13" :stroke-width="3" /></span>
            <span class="corpus-picker__copy">
              <strong>{{ title(corpus) }}<span v-if="corpus.is_recommended" class="corpus-picker__star" title="Recomendada">★</span></strong>
              <small v-if="subtitle(corpus)">{{ subtitle(corpus) }}</small>
            </span>
            <code v-if="!namedAfterCode(corpus)" class="corpus-picker__code">{{ corpus.code }}</code>
          </button>
        </div>
      </section>

      <button type="button" role="checkbox" class="corpus-picker__card corpus-picker__card--texts" :aria-checked="textsOnly" @click="chooseTextsOnly">
        <span class="corpus-picker__box" aria-hidden="true"><OrdoIcon v-if="textsOnly" name="check" :size="13" :stroke-width="3" /></span>
        <span class="corpus-picker__copy">
          <strong>Só os textos do livro</strong>
          <small>Textos, coletas e o saltério próprio do livro, sem nenhuma Bíblia. O mais leve.</small>
        </span>
      </button>

      <p v-if="selectedBibles > 1" class="corpus-picker__warn" role="status">
        <OrdoIcon name="alert" :size="15" />
        <span>{{ selectedBibles }} Bíblias inteiras: cada uma soma milhões de caracteres, e juntas podem esgotar a cota do provedor de voz.</span>
      </p>
    </template>
  </fieldset>
</template>

<style scoped>
.corpus-picker { display: flex; flex-direction: column; gap: 12px; min-width: 0; margin: 16px 0 0; padding: 0; border: 0; }
.corpus-picker__legend { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 12px; width: 100%; margin-bottom: 2px; padding: 0; color: var(--op-ink-soft); font-size: 12px; font-weight: 700; }
.corpus-picker__tools { display: inline-flex; align-items: baseline; gap: 12px; font-weight: 600; }
.corpus-picker__tools .op-link { font-size: 12.5px; }
.corpus-picker__count { color: var(--op-ink-faint); font-variant-numeric: tabular-nums; }
.corpus-picker__group { display: flex; flex-direction: column; gap: 8px; }
.corpus-picker__group-title { margin: 0; color: var(--op-ink); font-size: 12.5px; font-weight: 700; }
.corpus-picker__group-title span { color: var(--op-ink-faint); font-weight: 500; }
.corpus-picker__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.corpus-picker__card { display: flex; align-items: flex-start; gap: 10px; min-width: 0; padding: 10px 12px; border: 1px solid var(--op-hair); border-radius: 12px; background: var(--op-paper); color: var(--op-ink); cursor: pointer; text-align: left; transition: border-color .15s, background .15s, box-shadow .15s; }
.corpus-picker__card:hover { border-color: rgba(23, 84, 207, .4); }
.corpus-picker__card:focus-visible { outline: 2px solid var(--op-action); outline-offset: 2px; }
.corpus-picker__card[aria-checked="true"] { border-color: var(--op-action); background: var(--op-wash); box-shadow: inset 0 0 0 1px var(--op-action); }
.corpus-picker__card--texts { border-style: dashed; }
.corpus-picker__card--texts[aria-checked="true"] { border-style: solid; }
.corpus-picker__box { display: grid; flex: 0 0 auto; width: 18px; height: 18px; margin-top: 1px; place-items: center; border: 1.5px solid rgba(13, 39, 68, .28); border-radius: 5px; background: var(--op-card); color: #fff; }
.corpus-picker__card[aria-checked="true"] .corpus-picker__box { border-color: var(--op-action); background: var(--op-action); }
.corpus-picker__copy { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
.corpus-picker__copy strong { font-size: 13.5px; font-weight: 700; line-height: 1.3; }
.corpus-picker__copy small { overflow: hidden; display: -webkit-box; color: var(--op-ink-faint); font-size: 12px; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.corpus-picker__star { margin-left: 5px; color: var(--op-gold); font-size: 11px; }
.corpus-picker__code { flex: 0 0 auto; padding: 2px 6px; border-radius: 6px; background: var(--op-card); color: var(--op-ink-faint); font-family: var(--op-font-mono); font-size: 11px; }
.corpus-picker__warn { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 9px 12px; border-radius: 10px; background: var(--op-warn-wash); color: var(--op-warn); font-size: 12.5px; line-height: 1.45; }
.corpus-picker__warn svg { flex: 0 0 auto; margin-top: 1px; }
</style>
