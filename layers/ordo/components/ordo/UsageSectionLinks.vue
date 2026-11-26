<script setup lang="ts">
import OrdoIcon, { type OrdoIconName } from './Icon.vue'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'
import { audienceSplit, contentTitle, groupContent, latestActiveDay, type UsageSection } from '../../utils/usage'

// The other sections in one line each, with the number that makes them worth
// opening.
const api = useUsageApi()
const { core, open } = useUsageContext()
const funnels = useWindowReport(range => api.funnels(range))
const content = useWindowReport(range => api.content(range, 100))

const pct = (value: number, whole: number) => whole ? Math.round(value / whole * 100) : 0

const audience = computed(() => {
  const split = audienceSplit(latestActiveDay(core.active.data?.series || []), 'mes')
  if (!split || !split.people) return 'App, web, aparelho, idioma, livro e versão'
  return `${pct(split.appOnly, split.people)}% só no app · ${pct(split.webOnly, split.people)}% só na web · ${pct(split.both, split.people)}% nos dois`
})
const funnel = computed(() => {
  const office = funnels.data?.funnels.find(item => item.key === 'office')
  if (!office || office.rate === null || office.rate === undefined || !office.started) return 'Ofício, compartilhamento e Ordo+, passo a passo'
  return `${Math.round(office.rate * 100)}% dos dias em que alguém abre um ofício terminam com ele rezado`
})
const reading = computed(() => {
  const saints = groupContent(content.data?.rows || []).saints
  return saints.length ? `Mais aberto: ${contentTitle({ content_slug: saints[0].slug, title: saints[0].title })}` : 'Santos, documentos, artigos e rosários'
})

const links = computed<Array<{ id: UsageSection; title: string; text: string; icon: OrdoIconName; tone: string }>>(() => [
  { id: 'publico', title: 'Público', text: audience.value, icon: 'people', tone: 'op-tone-info' },
  { id: 'funis', title: 'Funis', text: funnel.value, icon: 'filter', tone: 'op-tone-gold' },
  { id: 'conteudo', title: 'Conteúdo', text: reading.value, icon: 'star', tone: 'op-tone-ok' }
])
</script>

<template>
  <nav class="op-grid" style="--op-min: 300px" aria-label="Outras seções do uso">
    <button v-for="link in links" :key="link.id" type="button" class="op-attn__item" @click="open(link.id)">
      <span class="op-attn__icon" :class="link.tone"><OrdoIcon :name="link.icon" :size="20" /></span>
      <span class="op-attn__copy"><strong>{{ link.title }}</strong><span>{{ link.text }}</span></span>
      <span class="op-attn__go"><OrdoIcon name="arrow" :size="16" /></span>
    </button>
  </nav>
</template>
