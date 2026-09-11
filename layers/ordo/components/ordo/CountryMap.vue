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
  return `${countryLabel(location)}: ${displayCount(count)} ${count === 1 ? 'usuário' : 'usuários'}, ${displayPercent(percent)} da base`
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
        <h2 id="ordo-country-map-title">De onde as pessoas rezam.</h2>
        <p class="ordo-country-map__description">País declarado tem prioridade; o timezone só entra quando aponta para um único país.</p>
      </div>
      <span class="ordo-scope-label">{{ geography.scope === 'lifetime' ? 'base total' : 'resumo disponível' }}</span>
    </header>

    <div class="ordo-country-map__metrics" aria-label="Resumo da cobertura geográfica">
      <div><span>Cobertura declarada</span><strong>{{ explicitCoverage == null ? '—' : displayPercent(explicitCoverage) }}</strong><small>país informado pela pessoa</small></div>
      <div><span>Cobertura resolvida</span><strong>{{ resolvedCoverage == null ? '—' : displayPercent(resolvedCoverage) }}</strong><small>declarada + timezone unívoco</small></div>
      <div><span>País declarado</span><strong>{{ displayCount(explicitCountryUsers) }}</strong><small>pessoas na base</small></div>
      <div><span>País inferido</span><strong>{{ displayCount(timezoneInferredUsers) }}</strong><small>timezone unívoco</small></div>
      <div><span>Sem localização</span><strong>{{ displayCount(unresolvedCountryUsers) }}</strong><small>ambíguo ou desconhecido</small></div>
    </div>

    <div class="ordo-country-map__body">
      <div class="ordo-country-map__visual">
        <div class="ordo-country-map__legend" aria-label="Legenda: branco representa nenhum usuário e azul mais escuro representa mais usuários">
          <span>0 usuários</span>
          <i aria-hidden="true" />
          <span>{{ displayCount(maximumCount) }} no máximo</span>
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
            <span>{{ displayCount(activeCountry.count) }} {{ activeCountry.count === 1 ? 'usuário' : 'usuários' }}</span>
            <small>{{ displayPercent(activeCountry.percent) }} da base</small>
          </div>
          <p v-else class="ordo-country-map__hint">Passe o cursor ou use Tab para consultar um país.</p>
        </div>
      </div>

      <aside class="ordo-country-map__ranking" aria-labelledby="ordo-country-ranking-title">
        <div class="ordo-country-map__ranking-header">
          <div>
            <p class="ordo-kicker">Ranking</p>
            <h3 id="ordo-country-ranking-title">Países com usuários</h3>
          </div>
          <span>{{ displayCount(totalUsers) }} total</span>
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
              <span class="ordo-country-map__rank">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="ordo-country-map__country-copy"><strong>{{ country.name }}</strong><small>{{ country.code === 'other' ? 'sem geometria no mapa' : country.code.toUpperCase() }}</small></span>
              <span class="ordo-country-map__country-value"><strong>{{ displayCount(country.count) }}</strong><small>{{ displayPercent(country.percent) }}</small></span>
            </button>
          </li>
        </ol>
        <p v-else class="ordo-country-map__empty">Ainda não há países resolvidos para colorir nesta resposta.</p>
      </aside>
    </div>

    <details class="ordo-country-map__table">
      <summary>Consultar dados em tabela acessível</summary>
      <div class="ordo-table-wrap">
        <table>
          <caption class="sr-only">Usuários agregados por país</caption>
          <thead><tr><th scope="col">País</th><th scope="col">Código</th><th scope="col">Usuários</th><th scope="col">Parcela da base</th></tr></thead>
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
.ordo-country-map {
  overflow: hidden;
  border: 1px solid rgba(50, 73, 56, .12);
  border-radius: 22px;
  background: rgba(251, 252, 248, .88);
  box-shadow: 0 12px 30px rgba(38, 55, 44, .05);
}

.ordo-country-map__header,
.ordo-country-map__ranking-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ordo-country-map__header { padding: 22px 24px 14px; }
.ordo-country-map h2 { margin: 7px 0 0; color: var(--moss-deep); font-family: 'Fraunces', Georgia, serif; font-size: 29px; font-weight: 600; letter-spacing: -.04em; }
.ordo-country-map h3 { margin: 7px 0 0; color: var(--moss-deep); font-family: 'Fraunces', Georgia, serif; font-size: 22px; font-weight: 600; letter-spacing: -.035em; }
.ordo-country-map__description { max-width: 590px; margin: 9px 0 0; color: #7e8b80; font-size: 11px; line-height: 1.5; }
.ordo-country-map__metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0 24px 18px; }
.ordo-country-map__metrics > div { min-width: 0; padding: 12px; border: 1px solid #e0e7dd; border-radius: 12px; background: #f4f7f1; }
.ordo-country-map__metrics span,
.ordo-country-map__metrics small { display: block; overflow: hidden; color: #859185; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.ordo-country-map__metrics strong { display: block; margin: 5px 0 3px; color: var(--moss-deep); font-family: 'Fraunces', Georgia, serif; font-size: 20px; font-weight: 600; }
.ordo-country-map__metrics small { color: #9aa49a; font-size: 9px; }
.ordo-country-map__body { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(250px, .75fr); gap: 22px; padding: 0 24px 22px; }
.ordo-country-map__visual { min-width: 0; }
.ordo-country-map__legend { display: flex; align-items: center; gap: 8px; color: #879387; font-size: 9px; font-weight: 700; }
.ordo-country-map__legend i { flex: 1; height: 8px; border: 1px solid #dce8de; border-radius: 99px; background: linear-gradient(90deg, #f7faf7, #e0eff7, #19577e); }
.ordo-country-map__canvas { position: relative; min-height: 300px; margin-top: 6px; }
.ordo-country-map__canvas svg { display: block; width: 100%; height: auto; overflow: visible; }
.ordo-country-map__canvas path { stroke: #fff; stroke-width: .7; vector-effect: non-scaling-stroke; outline: none; transition: fill 180ms ease, stroke 180ms ease, stroke-width 180ms ease; }
.ordo-country-map__canvas path:hover,
.ordo-country-map__canvas path:focus-visible,
.ordo-country-map__canvas path.is-active { stroke: var(--moss-deep); stroke-width: 1.7; }
.ordo-country-map__tooltip { position: absolute; top: 10px; left: 12px; display: grid; gap: 2px; min-width: 150px; padding: 10px 12px; border: 1px solid rgba(50, 73, 56, .14); border-radius: 12px; background: rgba(255, 255, 255, .94); box-shadow: 0 8px 20px rgba(38, 55, 44, .12); pointer-events: none; }
.ordo-country-map__tooltip strong { color: var(--moss-deep); font-size: 12px; }
.ordo-country-map__tooltip span { color: var(--ink); font-size: 11px; font-weight: 700; }
.ordo-country-map__tooltip small { color: #879387; font-size: 9px; }
.ordo-country-map__hint { margin: 0; color: #9aa49a; font-size: 10px; text-align: center; }
.ordo-country-map__ranking { min-width: 0; padding: 0 0 0 2px; }
.ordo-country-map__ranking-header > span { color: #8a968b; font-size: 9px; font-weight: 800; white-space: nowrap; }
.ordo-country-map__list { display: grid; gap: 2px; margin: 16px 0 0; padding: 0; list-style: none; }
.ordo-country-map__list button { display: flex; align-items: center; width: 100%; gap: 9px; padding: 9px 7px; border: 1px solid transparent; border-radius: 11px; background: transparent; color: inherit; cursor: pointer; font: inherit; text-align: left; }
.ordo-country-map__list button:hover,
.ordo-country-map__list button:focus-visible,
.ordo-country-map__list button.is-active { border-color: #d9e5d7; background: #f3f7f1; outline: none; }
.ordo-country-map__rank { display: grid; flex: 0 0 auto; width: 25px; height: 25px; place-items: center; border-radius: 8px; background: #e7eef3; color: #51788a; font-size: 9px; font-weight: 800; }
.ordo-country-map__country-copy { display: grid; flex: 1; min-width: 0; gap: 2px; }
.ordo-country-map__country-copy strong { overflow: hidden; color: #334538; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.ordo-country-map__country-copy small { color: #9aa49a; font-size: 9px; text-transform: uppercase; }
.ordo-country-map__country-value { display: grid; flex: 0 0 auto; justify-items: end; gap: 2px; }
.ordo-country-map__country-value strong { color: var(--moss-deep); font-family: 'Fraunces', Georgia, serif; font-size: 15px; font-weight: 600; }
.ordo-country-map__country-value small { color: #8b978b; font-size: 9px; }
.ordo-country-map__empty { margin: 20px 0; color: #8b958b; font-size: 11px; line-height: 1.5; }
.ordo-country-map__table { border-top: 1px solid #e5ece3; }
.ordo-country-map__table summary { padding: 13px 24px; color: var(--moss); cursor: pointer; font-size: 10px; font-weight: 800; list-style-position: inside; }
.ordo-country-map__table .ordo-table-wrap { padding-bottom: 6px; }
.ordo-country-map__table th { font-weight: 800; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

@media (max-width: 760px) {
  .ordo-country-map__body { grid-template-columns: 1fr; }
  .ordo-country-map__ranking { padding-top: 2px; }
  .ordo-country-map__list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 560px) {
  .ordo-country-map__header { display: block; padding-right: 16px; padding-left: 16px; }
  .ordo-country-map__header .ordo-scope-label { display: block; margin-top: 10px; }
  .ordo-country-map__metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); margin-right: 16px; margin-left: 16px; }
  .ordo-country-map__body { padding-right: 16px; padding-left: 16px; }
  .ordo-country-map__canvas { min-height: 190px; }
  .ordo-country-map__table summary { padding-right: 16px; padding-left: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  .ordo-country-map__canvas path { transition: none; }
}
</style>
