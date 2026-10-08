<template>
  <div>
    <EpiscopadoFichaBar kind="Pessoa" :toc="toc" :sheet="sheet" :graph-link="`/episcopado?no=p:${person.id}`" @back="emit('back')" @close="emit('close')" />

    <article class="px-5 pb-12 pt-7 min-[700px]:px-8" :class="sheet ? 'max-w-[720px]' : 'mx-auto max-w-[760px]'">
      <!-- Cabeçalho -->
      <header>
        <p class="ep-eyebrow !text-ep-garnet-ink">{{ kicker }}</p>
        <h1 class="mt-1.5 font-ep-serif text-[34px] font-semibold leading-[1.05] text-ep-ink min-[700px]:text-[44px]">{{ person.name }}</h1>
        <p v-if="person.fullName && person.fullName !== person.name" class="mt-1.5 text-[17px] text-ep-body">{{ person.fullName }}</p>
        <p v-if="lifeDates" class="mt-1 text-[13px] text-ep-muted">
          {{ lifeDates }}
          <EpiscopadoCites :cites="lifeCites" />
        </p>
        <p v-if="person.aliases.length" class="mt-2 text-xs text-ep-muted">
          Também: <span v-for="(a, i) in person.aliases" :key="a">{{ a }}<template v-if="i < person.aliases.length - 1"> · </template></span>
        </p>
        <div v-if="person.wikidata || person.links.length" class="mt-4 flex flex-wrap gap-2">
          <a v-if="person.wikidata" :href="`https://www.wikidata.org/wiki/${person.wikidata}`" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary ep-btn-sm">Wikidata ↗</a>
          <a v-for="l in person.links" :key="l" :href="l" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary ep-btn-sm">{{ hostOf(l) }} ↗</a>
        </div>

        <!-- Fatos rápidos -->
        <dl class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-5 gap-y-3.5 border-y border-ep-line py-4">
          <div v-if="consecration">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Sagração</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink">{{ formatDate(consecration.date) || 'data não registrada' }}</dd>
          </div>
          <div v-if="consecration?.principalConsecrator">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Sagrante principal</dt>
            <dd class="mt-[3px] text-sm font-medium"><NuxtLink :to="link.person(consecration.principalConsecrator.id)" class="ep-link">{{ consecration.principalConsecrator.name }}</NuxtLink></dd>
          </div>
          <div v-if="currentRoles.length">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">{{ currentRoles.length > 1 ? 'Funções atuais' : 'Função atual' }}</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink">
              <span v-for="(r, i) in currentRoles" :key="i">{{ r.role }} · <NuxtLink :to="link.jurisdiction(r.jurisdiction.id)" class="ep-link">{{ r.jurisdiction.acronym ?? r.jurisdiction.name }}</NuxtLink><template v-if="i < currentRoles.length - 1">; </template></span>
            </dd>
          </div>
          <div v-if="person.ordained.length">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Sagrou ou ordenou</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink"><button type="button" class="ep-link" @click="scrollTo('ordenou')">{{ person.ordained.length }} {{ person.ordained.length === 1 ? 'pessoa' : 'pessoas' }}</button></dd>
          </div>
          <div>
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Fontes</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink">
              <button type="button" class="ep-link" @click="scrollTo('fontes')">{{ person.footnotes.length }} {{ person.footnotes.length === 1 ? 'nota' : 'notas' }}</button>
              <span v-if="contestedCount" class="ml-1 text-xs font-normal text-ep-red">· {{ contestedCount }} {{ contestedCount === 1 ? 'afirmação contestada' : 'afirmações contestadas' }}</span>
            </dd>
          </div>
        </dl>
      </header>

      <!-- Resumo -->
      <section id="resumo" class="mt-7 scroll-mt-28">
        <h2 class="sr-only">Resumo</h2>
        <p v-if="person.biography" class="text-[17px] leading-[1.65] text-ep-ink-2">{{ person.biography }}<EpiscopadoCites :cites="person.biographyCites" /></p>
        <p v-else class="rounded-ep bg-ep-paper px-4 py-3 text-sm text-ep-muted">Ainda não há biografia registrada. Os dados abaixo vêm das fontes citadas em cada item.</p>
      </section>

      <!-- Ordenações -->
      <section id="ordenacoes" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title mb-4">Ordenações</h2>
        <EpiscopadoTimeline v-if="person.ordinations.length" :ordinations="person.ordinations" />
        <p v-else class="rounded-ep bg-ep-paper px-4 py-3 text-sm text-ep-muted">
          Nenhuma ordenação registrada ainda.
          <template v-if="person.ordained.length"> Esta pessoa aparece como sagrante ou ordenante de outras, portanto é bispo por implicação.</template>
        </p>
      </section>

      <!-- Linha de sucessão -->
      <section v-if="person.succession.length > 1 || person.successionEnd === 'unknown_consecrator'" id="sucessao" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title">Linha de sucessão</h2>
        <p class="mb-4 mt-1 text-[13px] text-ep-muted">Pelos sagrantes principais, do mais recente ao mais antigo registrado.</p>
        <EpiscopadoSuccession :steps="person.succession" :end="person.successionEnd" :alt="person.successionAlt" />
      </section>

      <!-- Quem ordenou/sagrou -->
      <section v-if="person.ordained.length" id="ordenou" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title mb-3">Sagrou e ordenou <span class="font-ep-sans text-sm font-normal text-ep-faint">{{ person.ordained.length }}</span></h2>
        <div v-for="group in ordainedGroups" :key="group.title" class="mb-5 last:mb-0">
          <h3 class="ep-eyebrow mb-1.5">{{ group.title }} <span class="font-normal text-ep-faint">{{ group.items.length }}</span></h3>
          <ul class="overflow-hidden rounded-ep border border-ep-line-2">
            <li v-for="(o, i) in group.items" :key="i" class="flex flex-wrap items-baseline gap-x-2.5 border-b border-ep-line-2 bg-ep-card px-3 py-2.5 text-sm last:border-b-0">
              <NuxtLink :to="link.person(o.person.id)" class="ep-link font-medium">{{ o.person.name }}</NuxtLink>
              <span class="text-[13px] tabular-nums text-ep-muted">{{ formatDate(o.date) || 'data não registrada' }}</span>
              <NuxtLink v-if="o.jurisdiction" :to="link.jurisdiction(o.jurisdiction.id)" class="text-[13px] text-ep-muted hover:underline">· {{ o.jurisdiction.acronym ?? o.jurisdiction.name }}</NuxtLink>
              <EpiscopadoStatus class="ml-auto" :status="o.status" :show-confirmed="false" />
            </li>
          </ul>
        </div>
      </section>

      <!-- Trajetória -->
      <section v-if="person.affiliations.length" id="trajetoria" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title mb-4">Trajetória</h2>
        <ol class="relative ml-3 border-l-2 border-ep-line">
          <li v-for="(a, i) in person.affiliations" :key="i" class="relative pb-5 pl-6 last:pb-0">
            <span class="absolute -left-[7px] top-[5px] h-3 w-3 rounded-full ring-4 ring-ep-card" :class="a.end ? 'bg-ep-rule' : 'bg-ep-teal'" aria-hidden="true" />
            <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
              <span class="font-semibold text-ep-ink">{{ a.roleDescription && a.role === 'other' ? a.roleDescription : ROLE_LABEL[a.role] }}</span>
              <NuxtLink :to="link.jurisdiction(a.jurisdiction.id)" class="ep-link">{{ a.jurisdiction.name }}</NuxtLink>
              <template v-if="a.diocese">
                <span class="text-ep-faint" aria-hidden="true">›</span>
                <NuxtLink :to="link.jurisdiction(a.diocese.id)" class="ep-link">{{ a.diocese.name }}</NuxtLink>
              </template>
              <EpiscopadoStatus :status="a.status" :show-confirmed="false" />
              <EpiscopadoCites :cites="a.cites" />
            </div>
            <p class="mt-0.5 text-[13px] text-ep-muted">
              {{ formatPeriod(a.start, a.end) || 'período não registrado' }}
              <span v-if="a.endReason"> · {{ END_REASON_LABEL[a.endReason] }}</span>
            </p>
            <details v-if="a.notes" class="mt-1 text-sm">
              <summary class="cursor-pointer text-ep-muted hover:text-ep-ink">Notas de pesquisa</summary>
              <p class="mt-1 whitespace-pre-line rounded-ep bg-ep-paper px-3 py-2 text-ep-body">{{ a.notes }}</p>
            </details>
            <EpiscopadoDiscrepancies :items="a.discrepancies" />
          </li>
        </ol>
      </section>

      <!-- Eventos -->
      <section v-if="person.events.length" id="eventos" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title mb-4">Eventos</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="(e, i) in person.events" :key="i" class="grid grid-cols-[88px_1fr] gap-3 text-sm min-[700px]:grid-cols-[104px_1fr]">
            <span class="pt-0.5 text-right text-[13px] tabular-nums text-ep-muted">{{ formatDate(e.date) || '—' }}</span>
            <div class="min-w-0 border-l border-ep-line pl-3">
              <p class="flex flex-wrap items-baseline gap-x-2">
                <span class="font-semibold text-ep-ink">{{ EVENT_LABEL[e.type as keyof typeof EVENT_LABEL] }}</span>
                <NuxtLink v-if="e.jurisdiction" :to="link.jurisdiction(e.jurisdiction.id)" class="text-ep-muted hover:underline">{{ e.jurisdiction.acronym ?? e.jurisdiction.name }}</NuxtLink>
                <EpiscopadoStatus :status="e.status" :show-confirmed="false" />
                <EpiscopadoCites :cites="e.cites" />
              </p>
              <p class="mt-[3px] leading-normal text-ep-ink-3">{{ e.description }}</p>
              <EpiscopadoDiscrepancies :items="e.discrepancies" />
            </div>
          </li>
        </ul>
      </section>

      <EpiscopadoFootnotes :footnotes="person.footnotes" />
      <EpiscopadoHowToRead />
    </article>
  </div>
</template>

<script setup lang="ts">
import { END_REASON_LABEL, EVENT_LABEL, ROLE_LABEL, formatDate, formatPeriod } from '../../lib/labels'
import type { OrdainedView, PersonView } from '../../lib/views'
import type { TocItem } from './EpiscopadoToc.vue'

/** Ficha completa de uma pessoa; usada na página da ficha e na folha sobre o grafo (`sheet`). */
const props = defineProps<{ person: PersonView; sheet?: boolean }>()
const emit = defineEmits<{ back: []; close: [] }>()

const link = useEpiscopadoNodeLink()
provideEpiscopadoFootnotes(computed(() => props.person.footnotes))

const consecration = computed(() => props.person.ordinations.find((o) => o.order === 'episcopate') ?? null)

/** Vínculos sem data de fim, do mais alto para o mais baixo. */
const currentRoles = computed(() =>
  props.person.affiliations
    .filter((a) => !a.end && a.start)
    .map((a) => ({ role: a.roleDescription && a.role === 'other' ? a.roleDescription : ROLE_LABEL[a.role], jurisdiction: a.diocese ?? a.jurisdiction }))
    .slice(-3)
    .reverse()
)

const kicker = computed(() => {
  const p = props.person
  const orders = new Set(p.ordinations.map((o) => o.order))
  const label = orders.has('episcopate') ? 'Bispo' : orders.has('presbyterate') ? 'Presbítero' : orders.has('diaconate') ? 'Diácono' : p.ordained.length ? 'Bispo · inferido' : 'Pessoa'
  const roles = currentRoles.value.map((r) => r.jurisdiction.acronym ?? r.jurisdiction.name)
  return [label, ...new Set(roles)].join(' · ')
})

const lifeDates = computed(() => {
  const p = props.person
  if (!p.birth?.date && !p.death?.date) return ''
  const birth = formatDate(p.birth?.date)
  const death = formatDate(p.death?.date)
  if (birth && death) return `${birth} – ${death}`
  if (birth) return `Nascimento: ${birth}${p.birth?.place ? `, ${p.birth.place}` : ''}`
  return `Falecimento: ${death}${p.death?.place ? `, ${p.death.place}` : ''}`
})

/** Notas de nascimento e falecimento, sem repetir número. */
const lifeCites = computed(() => [...new Set([...(props.person.birth?.cites ?? []), ...(props.person.death?.cites ?? [])])])

const contestedCount = computed(() => {
  const p = props.person
  return [...p.ordinations, ...p.affiliations, ...p.events].filter((c) => c.status === 'contested').length
})

const ordainedGroups = computed(() => {
  const list = props.person.ordained
  const groups: { title: string; items: OrdainedView[] }[] = [
    { title: 'Sagrou como sagrante principal', items: list.filter((o) => o.role === 'principal') },
    { title: 'Co-sagrou', items: list.filter((o) => o.role === 'co') },
    { title: 'Ordenou presbíteros', items: list.filter((o) => o.role === 'ordainer' && o.order === 'presbyterate') },
    { title: 'Ordenou diáconos', items: list.filter((o) => o.role === 'ordainer' && o.order === 'diaconate') }
  ]
  return groups.filter((g) => g.items.length)
})

const toc = computed<TocItem[]>(() => {
  const p = props.person
  return [
    { id: 'resumo', label: 'Resumo' },
    { id: 'ordenacoes', label: 'Ordenações', count: p.ordinations.length },
    ...(p.succession.length > 1 || p.successionEnd === 'unknown_consecrator' ? [{ id: 'sucessao', label: 'Sucessão', count: p.succession.length }] : []),
    ...(p.ordained.length ? [{ id: 'ordenou', label: 'Sagrou e ordenou', count: p.ordained.length }] : []),
    ...(p.affiliations.length ? [{ id: 'trajetoria', label: 'Trajetória', count: p.affiliations.length }] : []),
    ...(p.events.length ? [{ id: 'eventos', label: 'Eventos', count: p.events.length }] : []),
    { id: 'fontes', label: 'Fontes', count: p.footnotes.length }
  ]
})

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Link'
  }
}
</script>
