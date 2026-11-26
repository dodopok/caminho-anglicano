<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import OrdoSoonState from './SoonState.vue'
import OrdoUsageFunnelCard from './UsageFunnelCard.vue'
import { errorText } from '../../composables/useReport'
import { useUsageApi } from '../../composables/useUsageApi'
import { useUsageContext, useWindowReport } from '../../composables/useUsageContext'

// Funis: the API's funnels told in words, and the "Primeiro acesso" funnel
// as soon as the API has it.
const api = useUsageApi()
const { appEvents } = useUsageContext()
const funnels = useWindowReport(range => api.funnels(range))
const funnelsPrevious = useWindowReport((_, before) => before ? api.funnels(before) : Promise.resolve(null))

const ORDER = ['office', 'share', 'paywall']
const list = computed(() => [...(funnels.data?.funnels || [])]
  .filter(item => item.key !== 'first_access')
  .sort((a, b) => (ORDER.indexOf(a.key) + 1 || 99) - (ORDER.indexOf(b.key) + 1 || 99)))
const firstAccess = computed(() => funnels.data?.funnels.find(item => item.key === 'first_access') || null)
const previousOf = (key: string) => funnelsPrevious.data?.funnels.find(item => item.key === key) || null
const PROPOSED = ['Começou o primeiro acesso', 'Terminou o primeiro acesso', 'Rezou o primeiro ofício']
</script>

<template>
  <p v-if="!appEvents" class="op-inline-note">
    <OrdoIcon name="info" :size="18" />
    <span>Os passos que acontecem no aparelho (abrir um ofício, abrir o compartilhamento, ver o Ordo+) chegam hoje <strong>só da web</strong>. Até o app 1.46 sair, estes funis falam de quem usa o Ordo no navegador. A conversão por pessoa lê os eventos brutos, guardados por 90 dias.</span>
  </p>

  <span v-if="funnels.loading && !funnels.data" class="op-skeleton" style="height: 320px; border-radius: 20px" aria-hidden="true" />
  <OrdoSoonState v-else-if="funnels.soon" title="Funis em breve" text="A API em uso ainda não tem o relatório de funis." />
  <p v-else-if="funnels.error" class="op-inline-error" role="alert"><OrdoIcon name="alert" :size="18" />Funis: {{ errorText(funnels.error) }}</p>
  <section v-else class="op-grid op-usage__funnels" aria-label="Funis">
    <OrdoUsageFunnelCard
      v-for="funnel in list"
      :key="funnel.key"
      :funnel="funnel"
      :previous="previousOf(funnel.key)"
      :raw-window="funnels.data?.raw_window ?? null"
      :partial="funnel.key === 'paywall' && !appEvents"
    />
    <OrdoUsageFunnelCard v-if="firstAccess" :funnel="firstAccess" :previous="previousOf('first_access')" :raw-window="funnels.data?.raw_window ?? null" :partial="!appEvents" />
    <section v-else class="op-card op-panel op-usage__proposed">
      <div class="op-panel__head">
        <div class="op-panel__heading">
          <p class="op-eyebrow">Funil · proposto</p>
          <h3>Primeiro acesso</h3>
          <p>De abrir o app pela primeira vez a rezar o primeiro ofício.</p>
        </div>
        <OrdoSoonState compact title="em breve" text="O funil ainda não está na API" />
      </div>
      <ol class="op-funnel op-funnel--muted" aria-hidden="true">
        <li v-for="(label, index) in PROPOSED" :key="label" class="op-funnel__step">
          <span class="op-funnel__n">{{ index + 1 }}</span>
          <span class="op-funnel__label">{{ label }}</span>
          <span class="op-funnel__value">—</span>
          <div class="op-funnel__bar"><span :style="{ width: `${[100, 70, 45][index]}%` }" /></div>
        </li>
      </ol>
      <div class="op-panel__foot"><span>Os eventos <code>onboarding_started</code> e <code>onboarding_completed</code> já existem; falta o funil na API.</span></div>
    </section>
  </section>
</template>
