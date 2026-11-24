<script setup lang="ts">
import worldMap from '@svg-maps/world'
import type { DashboardGeography } from '../../types/dashboard'
import { countryFill, createCountryMapData, normalizeCountryCode, type CountryMapDatum } from '../../utils/countryMap'

const props = defineProps<{
  geography: DashboardGeography
}>()

type WorldLocation = (typeof worldMap.locations)[number]

const mapLocations = worldMap.locations as readonly WorldLocation[]
const hoveredCode = ref<string | null>(null)
const focusedCode = ref<string | null>(null)
const selectedCode = ref<string | null>(null)

const countryDisplayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['pt-BR'], { type: 'region' })
  : null

const nameForCode = (code: string, fallback?: string) => {
  if (code === 'other') return 'Ambíguo ou desconhecido'

  const normalizedCode = normalizeCountryCode(code)
  if (!normalizedCode) return fallback || code

  return countryDisplayNames?.of(normalizedCode.toUpperCase()) || fallback || normalizedCode.toUpperCase()
}

const countryBreakdownCounts = computed(() => {
  if (Array.isArray(props.geography.country_breakdown)) {
    return props.geography.country_breakdown.reduce<Record<string, number>>((counts, item) => {
      const rawCode = typeof item.country_code === 'string' ? item.country_code.trim().toLowerCase() : ''
      const code = rawCode === 'other' ? rawCode : normalizeCountryCode(rawCode)
      const users = Number(item.users)
      if (!code || !Number.isFinite(users) || users <= 0) return counts

      counts[code] = (counts[code] || 0) + users
      return counts
    }, {})
  }

  return props.geography.by_country
})

const countryData = computed<CountryMapDatum[]>(() => createCountryMapData(
  countryBreakdownCounts.value,
  props.geography.coverage?.total_users ?? props.geography.total_users,
  mapLocations,
  nameForCode
))

const dataByCode = computed(() => new Map(countryData.value.map(item => [item.code, item])))
const mappedCountries = computed(() => countryData.value.filter(item => item.hasGeometry))
const maximumCount = computed(() => Math.max(...mappedCountries.value.map(item => item.count), 0))
const totalUsers = computed(() => Math.max(Number(props.geography.coverage?.total_users ?? props.geography.total_users) || 0, 0))
const activeCode = computed(() => selectedCode.value || focusedCode.value || hoveredCode.value)
const activeCountry = computed(() => activeCode.value ? dataByCode.value.get(activeCode.value) || null : null)
const topCountries = computed(() => mappedCountries.value.slice(0, 6))
const hasCountryData = computed(() => mappedCountries.value.length > 0)
const hasCountryRows = computed(() => countryData.value.length > 0)
const explicitCoverage = computed(() => props.geography.coverage?.explicit_country_percentage ?? props.geography.explicit_country_percentage ?? props.geography.country_coverage_percentage)
const resolvedCoverage = computed(() => props.geography.coverage?.resolved_country_percentage ?? props.geography.resolved_country_coverage_percentage)
const explicitCountryUsers = computed(() => props.geography.coverage?.explicit_country_users ?? props.geography.explicit_country_users)
const timezoneInferredUsers = computed(() => props.geography.coverage?.timezone_inferred_country_users ?? props.geography.derived_country_users)
const unresolvedCountryUsers = computed(() => props.geography.coverage?.unresolved_country_users ?? props.geography.ambiguous_or_unknown_timezone_users)

const displayCount = (count: number | null | undefined) => new Intl.NumberFormat('pt-BR').format(Math.max(Number(count) || 0, 0))
const displayPercent = (percent: number | null | undefined) => `${(Number(percent) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
const mapColor = (code: string) => countryFill(dataByCode.value.get(code)?.count || 0, maximumCount.value)
const countryLabel = (location: WorldLocation) => nameForCode(location.id, location.name)
const countryAriaLabel = (location: WorldLocation) => {
  const datum = dataByCode.value.get(location.id.toLowerCase())
  const count = datum?.count || 0
  const percent = datum?.percent || 0
  return `${countryLabel(location)}: ${displayCount(count)} ${count === 1 ? 'pessoa' : 'pessoas'}, ${displayPercent(percent)} da base`
}

const setHovered = (code: string | null) => { hoveredCode.value = code }
const setFocused = (code: string | null) => { focusedCode.value = code }
const toggleSelected = (code: string) => {
  selectedCode.value = selectedCode.value === code ? null : code
}
</script>

<template>
  <section class="ordo-country-map" aria-labelledby="ordo-country-map-title">
    <header class="ordo-country-map__header">
      <div>
        <p class="ordo-kicker">Geografia</p>
        <h2 id="ordo-country-map-title">De onde se reza</h2>
        <p class="ordo-country-map__description">Vale o país que a pessoa informou. Quando ela não informou, usamos o fuso horário, mas só se ele apontar para um único país.</p>
      </div>
      <span class="op-tag op-tag--lifetime"><i aria-hidden="true" />Base total</span>
    </header>

    <div class="ordo-country-map__metrics" aria-label="Resumo da cobertura geográfica">
      <div><span>Informaram o país</span><strong>{{ explicitCoverage == null ? '—' : displayPercent(explicitCoverage) }}</strong><small>da base</small></div>
      <div><span>Com país conhecido</span><strong>{{ resolvedCoverage == null ? '—' : displayPercent(resolvedCoverage) }}</strong><small>informado ou pelo fuso</small></div>
      <div><span>Informaram</span><strong>{{ displayCount(explicitCountryUsers) }}</strong><small>pessoas</small></div>
      <div><span>Pelo fuso horário</span><strong>{{ displayCount(timezoneInferredUsers) }}</strong><small>pessoas</small></div>
      <div><span>Sem localização</span><strong>{{ displayCount(unresolvedCountryUsers) }}</strong><small>fuso ambíguo ou ausente</small></div>
    </div>

    <div class="ordo-country-map__body">
      <div class="ordo-country-map__visual">
        <div class="ordo-country-map__legend" aria-label="Legenda: bege representa ninguém e azul mais escuro representa mais pessoas">
          <span>Nenhuma</span>
          <i aria-hidden="true" />
          <span>{{ displayCount(maximumCount) }} pessoas</span>
        </div>

        <div class="ordo-country-map__canvas">
          <svg
            :viewBox="worldMap.viewBox"
            role="img"
            aria-labelledby="ordo-country-map-title ordo-country-map-description"
            preserveAspectRatio="xMidYMid meet"
          >
            <desc id="ordo-country-map-description">Mapa mundial de usuários agregados por país. Use Tab para navegar pelos países.</desc>
            <path
              v-for="location in mapLocations"
              :key="location.id"
              :d="location.path"
              :fill="mapColor(location.id.toLowerCase())"
              :aria-label="countryAriaLabel(location)"
              :class="{ 'is-active': activeCode === location.id.toLowerCase() }"
              role="img"
              tabindex="0"
              @mouseenter="setHovered(location.id.toLowerCase())"
              @mouseleave="setHovered(null)"
              @focus="setFocused(location.id.toLowerCase())"
              @blur="setFocused(null)"
            />
          </svg>

          <div v-if="activeCountry" class="ordo-country-map__tooltip" role="status" aria-live="polite">
            <strong>{{ activeCountry.name }}</strong>
            <span>{{ displayCount(activeCountry.count) }} {{ activeCountry.count === 1 ? 'pessoa' : 'pessoas' }}</span>
            <small>{{ displayPercent(activeCountry.percent) }} da base</small>
          </div>
          <!-- Always in the flow, only hidden: removing it made the map jump up under the cursor. -->
          <p class="ordo-country-map__hint" :class="{ 'is-hidden': activeCountry }" :aria-hidden="activeCountry ? 'true' : undefined">Passe o cursor ou use Tab para consultar um país.</p>
        </div>
      </div>

      <aside class="ordo-country-map__ranking" aria-labelledby="ordo-country-ranking-title">
        <div class="ordo-country-map__ranking-header">
          <div>
            <p class="ordo-kicker">Onde há mais gente</p>
            <h3 id="ordo-country-ranking-title">Países</h3>
          </div>
          <span>{{ displayCount(totalUsers) }} na base</span>
        </div>

        <ol v-if="hasCountryData" class="ordo-country-map__list">
          <li v-for="(country, index) in topCountries" :key="country.code">
            <button
              type="button"
              :class="{ 'is-active': activeCode === country.code }"
              :aria-pressed="selectedCode === country.code"
              @click="toggleSelected(country.code)"
              @mouseenter="setHovered(country.code)"
              @mouseleave="setHovered(null)"
              @focus="setFocused(country.code)"
              @blur="setFocused(null)"
            >
              <span class="ordo-country-map__rank">{{ index + 1 }}</span>
              <span class="ordo-country-map__country-copy"><strong>{{ country.name }}</strong><small>{{ country.code === 'other' ? 'sem geometria no mapa' : country.code.toUpperCase() }}</small></span>
              <span class="ordo-country-map__country-value"><strong>{{ displayCount(country.count) }}</strong><small>{{ displayPercent(country.percent) }}</small></span>
            </button>
          </li>
        </ol>
        <p v-else class="ordo-country-map__empty">Ainda não há países resolvidos para colorir nesta resposta.</p>
      </aside>
    </div>

    <details class="ordo-country-map__table">
      <summary>Ver todos os países em tabela</summary>
      <div class="ordo-table-wrap">
        <table>
          <caption class="sr-only">Pessoas por país</caption>
          <thead><tr><th scope="col">País</th><th scope="col">Código</th><th scope="col">Pessoas</th><th scope="col">Parcela da base</th></tr></thead>
          <tbody>
            <tr v-for="country in countryData" :key="`table-${country.code}`"><th scope="row">{{ country.name }}</th><td>{{ country.code === 'other' ? '—' : country.code.toUpperCase() }}</td><td>{{ displayCount(country.count) }}</td><td>{{ displayPercent(country.percent) }}</td></tr>
            <tr v-if="!hasCountryRows"><td colspan="4">Sem dados de país para exibir.</td></tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<style scoped>
.ordo-country-map { overflow: hidden; border: 1px solid var(--op-hair); border-radius: var(--op-radius); background: var(--op-card); box-shadow: var(--op-shadow); }
.ordo-country-map__header, .ordo-country-map__ranking-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ordo-country-map__header { flex-wrap: wrap; padding: 24px 24px 14px; }
.ordo-country-map h2 { margin: 4px 0 0; font-family: var(--op-font-display); font-size: 22px; font-weight: 600; }
.ordo-country-map h3 { margin: 4px 0 0; font-family: var(--op-font-display); font-size: 18px; font-weight: 600; }
.ordo-country-map__description { max-width: 620px; margin: 6px 0 0; color: var(--op-ink-soft); font-size: 13.5px; line-height: 1.5; }
.ordo-country-map__metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 0 24px 18px; }
.ordo-country-map__metrics > div { min-width: 0; padding: 12px 14px; border-radius: 14px; background: var(--op-paper); }
.ordo-country-map__metrics span, .ordo-country-map__metrics small { display: block; overflow: hidden; color: var(--op-ink-faint); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.ordo-country-map__metrics strong { display: block; margin: 4px 0 2px; font-family: var(--op-font-display); font-size: 22px; font-weight: 600; }
.ordo-country-map__metrics small { font-size: 11.5px; }
.ordo-country-map__body { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(250px, .8fr); gap: 24px; padding: 0 24px 22px; }
.ordo-country-map__visual { min-width: 0; }
.ordo-country-map__legend { display: flex; align-items: center; gap: 8px; color: var(--op-ink-faint); font-size: 12px; }
.ordo-country-map__legend i { flex: 0 1 160px; height: 8px; border-radius: 99px; background: linear-gradient(90deg, #c9d8f1, #8da9e3, #4f79d6, #1745a8); }
.ordo-country-map__canvas { position: relative; min-height: 300px; margin-top: 8px; border-radius: 16px; background: #f7f9fc; }
.ordo-country-map__canvas svg { display: block; width: 100%; height: auto; overflow: visible; }
.ordo-country-map__canvas path { stroke: #fff; stroke-width: .6; vector-effect: non-scaling-stroke; outline: none; transition: fill 160ms ease, stroke 160ms ease; cursor: pointer; }
.ordo-country-map__canvas path:hover, .ordo-country-map__canvas path:focus-visible, .ordo-country-map__canvas path.is-active { stroke: var(--op-ink); stroke-width: 1.6; }
.ordo-country-map__tooltip { position: absolute; top: 12px; left: 12px; display: grid; gap: 2px; min-width: 170px; padding: 10px 14px; border-radius: 12px; background: var(--op-ink); color: var(--op-rail-ink); box-shadow: 0 12px 28px -14px rgba(13, 39, 68, .6); pointer-events: none; }
.ordo-country-map__tooltip strong { font-size: 13.5px; }
.ordo-country-map__tooltip span { font-family: var(--op-font-display); font-size: 18px; font-weight: 600; }
.ordo-country-map__tooltip small { color: var(--op-rail-soft); font-size: 12px; }
.ordo-country-map__hint { margin: 8px 0 0; color: var(--op-ink-faint); font-size: 12.5px; text-align: center; transition: opacity 120ms ease; }
.ordo-country-map__hint.is-hidden { visibility: hidden; opacity: 0; }
.ordo-country-map__ranking { min-width: 0; }
.ordo-country-map__ranking-header > span { color: var(--op-ink-faint); font-size: 12.5px; white-space: nowrap; }
.ordo-country-map__list { display: grid; gap: 2px; margin: 12px 0 0; padding: 0; list-style: none; }
.ordo-country-map__list button { display: flex; align-items: center; width: 100%; gap: 10px; padding: 9px 8px; border: 1px solid transparent; border-radius: 12px; background: transparent; cursor: pointer; text-align: left; }
.ordo-country-map__list button:hover, .ordo-country-map__list button:focus-visible, .ordo-country-map__list button.is-active { border-color: rgba(23, 84, 207, .35); background: var(--op-paper); outline: none; }
.ordo-country-map__rank { display: grid; flex: 0 0 auto; width: 26px; height: 26px; place-items: center; border-radius: 8px; background: var(--op-wash); color: var(--op-action-hover); font: 700 11px/1 var(--op-font-mono); }
.ordo-country-map__country-copy { display: grid; flex: 1; min-width: 0; gap: 2px; }
.ordo-country-map__country-copy strong { overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.ordo-country-map__country-copy small { color: var(--op-ink-faint); font-size: 11.5px; text-transform: uppercase; }
.ordo-country-map__country-value { display: grid; flex: 0 0 auto; justify-items: end; gap: 2px; }
.ordo-country-map__country-value strong { font-family: var(--op-font-display); font-size: 17px; font-weight: 600; }
.ordo-country-map__country-value small { color: var(--op-ink-faint); font-size: 12px; }
.ordo-country-map__empty { margin: 20px 0; color: var(--op-ink-faint); font-size: 13.5px; line-height: 1.5; }
.ordo-country-map__table { border-top: 1px solid var(--op-hair-soft); }
.ordo-country-map__table summary { padding: 14px 24px; color: var(--op-action); cursor: pointer; font-size: 13.5px; font-weight: 600; list-style-position: inside; }
.ordo-country-map__table .ordo-table-wrap { padding: 0 24px 12px; }
.ordo-country-map__table table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.ordo-country-map__table th, .ordo-country-map__table td { padding: 8px 10px; border-top: 1px solid var(--op-hair-soft); text-align: left; }
.ordo-country-map__table thead th { color: var(--op-ink-faint); font-size: 12px; font-weight: 600; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

@media (max-width: 760px) {
  .ordo-country-map__body { grid-template-columns: 1fr; }
  .ordo-country-map__list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .ordo-country-map__header { padding-right: 16px; padding-left: 16px; }
  .ordo-country-map__metrics { margin-right: 16px; margin-left: 16px; }
  .ordo-country-map__body { padding-right: 16px; padding-left: 16px; }
  .ordo-country-map__canvas { min-height: 190px; }
  .ordo-country-map__list { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .ordo-country-map__canvas path { transition: none; }
}
</style>
