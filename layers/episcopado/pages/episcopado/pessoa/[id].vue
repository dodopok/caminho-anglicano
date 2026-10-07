<template>
  <div class="episcopado flex min-h-screen flex-col bg-stone-50">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <EpiscopadoNotFound v-if="notFound" :id="id" kind="Pessoa" :nodes="graph.nodes" only="person" />

    <main v-else-if="loadError" class="mx-auto max-w-2xl px-4 py-16 text-center" role="alert">
      <h1 class="font-serif text-3xl font-semibold text-stone-900">Não foi possível carregar esta ficha</h1>
      <p class="mt-2 text-stone-600">{{ loadError.message }}</p>
      <button type="button" class="ep-btn ep-btn-primary mt-6" @click="refresh()">Tentar de novo</button>
    </main>

    <main v-else-if="person" class="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <nav aria-label="Você está em" class="mb-4 text-xs text-stone-500">
        <ol class="flex flex-wrap items-center gap-1">
          <li><NuxtLink to="/episcopado" class="hover:text-stone-800 hover:underline">Rede do Episcopado</NuxtLink></li>
          <li aria-hidden="true">›</li>
          <li>Pessoa</li>
          <li aria-hidden="true">›</li>
          <li class="text-stone-800" aria-current="page">{{ person.name }}</li>
        </ol>
      </nav>

      <div class="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <!-- Sumário -->
        <aside class="mb-4 lg:mb-0">
          <div class="lg:sticky lg:top-20">
            <EpiscopadoToc :items="toc" />
            <div class="mt-4 hidden rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600 lg:block">
              <p class="font-semibold uppercase tracking-wide text-stone-400">Como ler</p>
              <p class="mt-1.5">Cada [n] abre a fonte e o trecho que sustenta a afirmação. Os selos indicam o grau de certeza.</p>
              <ul class="mt-2 space-y-1">
                <li v-for="s in (['confirmed', 'probable', 'contested'] as const)" :key="s" class="flex items-start gap-1.5">
                  <EpiscopadoStatus :status="s" />
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <article class="min-w-0 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <!-- Cabeçalho -->
          <header class="border-b border-stone-200 px-5 pb-6 pt-6 sm:px-10 sm:pt-8">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-800">
              {{ kicker }}
            </p>
            <h1 class="mt-1 font-serif text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">{{ person.name }}</h1>
            <p v-if="person.fullName && person.fullName !== person.name" class="mt-1 text-lg text-stone-600">{{ person.fullName }}</p>
            <p v-if="lifeDates" class="mt-1 text-sm text-stone-500">
              {{ lifeDates }}
              <EpiscopadoCites :cites="lifeCites" />
            </p>
            <p v-if="person.aliases.length" class="mt-2 text-xs text-stone-500">
              Também: <span v-for="(a, i) in person.aliases" :key="a">{{ a }}<template v-if="i < person.aliases.length - 1"> · </template></span>
            </p>

            <div class="mt-5 flex flex-wrap gap-2">
              <NuxtLink :to="`/episcopado?no=p:${person.id}`" class="ep-btn ep-btn-primary">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a3 3 0 00-1 5.83V9H6a3 3 0 100 2h3v1.17a3 3 0 101 0V11h3a3 3 0 100-2h-3V7.83A3 3 0 0010 2z" /></svg>
                Ver na rede
              </NuxtLink>
              <a v-if="person.wikidata" :href="`https://www.wikidata.org/wiki/${person.wikidata}`" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary">Wikidata ↗</a>
              <a v-for="l in person.links" :key="l" :href="l" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary">{{ hostOf(l) }} ↗</a>
            </div>

            <!-- Fatos rápidos -->
            <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div v-if="consecration">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Sagração</dt>
                <dd class="mt-0.5 font-medium text-stone-900">{{ formatDate(consecration.date) || 'data não registrada' }}</dd>
              </div>
              <div v-if="consecration?.principalConsecrator">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Sagrante principal</dt>
                <dd class="mt-0.5 font-medium"><NuxtLink :to="`/episcopado/pessoa/${consecration.principalConsecrator.id}`" class="ep-link">{{ consecration.principalConsecrator.name }}</NuxtLink></dd>
              </div>
              <div v-if="currentRoles.length">
                <dt class="text-xs uppercase tracking-wide text-stone-400">{{ currentRoles.length > 1 ? 'Funções atuais' : 'Função atual' }}</dt>
                <dd class="mt-0.5 font-medium text-stone-900">
                  <span v-for="(r, i) in currentRoles" :key="i">{{ r.role }} · <NuxtLink :to="`/episcopado/jurisdicao/${r.jurisdiction.id}`" class="ep-link">{{ r.jurisdiction.acronym ?? r.jurisdiction.name }}</NuxtLink><template v-if="i < currentRoles.length - 1">; </template></span>
                </dd>
              </div>
              <div v-if="person.ordained.length">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Sagrou ou ordenou</dt>
                <dd class="mt-0.5 font-medium text-stone-900"><a href="#ordenou" class="ep-link">{{ person.ordained.length }} {{ person.ordained.length === 1 ? 'pessoa' : 'pessoas' }}</a></dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-stone-400">Fontes</dt>
                <dd class="mt-0.5 font-medium text-stone-900">
                  <a href="#fontes" class="ep-link">{{ person.footnotes.length }} {{ person.footnotes.length === 1 ? 'nota' : 'notas' }}</a>
                  <span v-if="contestedCount" class="ml-1 text-xs font-normal text-red-700">· {{ contestedCount }} {{ contestedCount === 1 ? 'afirmação contestada' : 'afirmações contestadas' }}</span>
                </dd>
              </div>
            </dl>
          </header>

          <div class="px-5 py-6 sm:px-10 sm:py-8">
            <!-- Resumo -->
            <section id="resumo" class="scroll-mt-24">
              <h2 class="ep-section-title sr-only">Resumo</h2>
              <p v-if="person.biography" class="text-[17px] leading-relaxed text-stone-800">{{ person.biography }}<EpiscopadoCites :cites="person.biographyCites" /></p>
              <p v-else class="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-500">Ainda não há biografia registrada. Os dados abaixo vêm das fontes citadas em cada item.</p>
            </section>

            <!-- Ordenações -->
            <section id="ordenacoes" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-5">Ordenações</h2>
              <EpiscopadoTimeline v-if="person.ordinations.length" :ordinations="person.ordinations" />
              <p v-else class="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-500">
                Nenhuma ordenação registrada ainda.
                <template v-if="person.ordained.length"> Esta pessoa aparece como sagrante ou ordenante de outras, portanto é bispo por implicação.</template>
              </p>
            </section>

            <!-- Linha de sucessão -->
            <section v-if="person.succession.length > 1 || person.successionEnd === 'unknown_consecrator'" id="sucessao" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title">Linha de sucessão</h2>
              <p class="mb-4 mt-1 text-sm text-stone-500">Pelos sagrantes principais, do mais recente ao mais antigo registrado.</p>
              <EpiscopadoSuccession :steps="person.succession" :end="person.successionEnd" />
            </section>

            <!-- Quem ordenou/sagrou -->
            <section v-if="person.ordained.length" id="ordenou" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-4">Sagrou e ordenou</h2>
              <div v-for="group in ordainedGroups" :key="group.title" class="mb-5 last:mb-0">
                <h3 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">{{ group.title }} <span class="font-normal text-stone-400">{{ group.items.length }}</span></h3>
                <ul class="divide-y divide-stone-100 rounded-lg border border-stone-100">
                  <li v-for="(o, i) in group.items" :key="i" class="flex flex-wrap items-baseline gap-x-2 px-3 py-2 text-sm">
                    <NuxtLink :to="`/episcopado/pessoa/${o.person.id}`" class="ep-link font-medium">{{ o.person.name }}</NuxtLink>
                    <span class="text-stone-500 tabular-nums">{{ formatDate(o.date) || 'data não registrada' }}</span>
                    <NuxtLink v-if="o.jurisdiction" :to="`/episcopado/jurisdicao/${o.jurisdiction.id}`" class="text-stone-500 hover:underline">· {{ o.jurisdiction.acronym ?? o.jurisdiction.name }}</NuxtLink>
                    <EpiscopadoStatus class="ml-auto" :status="o.status" :show-confirmed="false" />
                  </li>
                </ul>
              </div>
            </section>

            <!-- Trajetória -->
            <section v-if="person.affiliations.length" id="trajetoria" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-4">Trajetória</h2>
              <ol class="relative ml-3 border-l-2 border-stone-200 sm:ml-4">
                <li v-for="(a, i) in person.affiliations" :key="i" class="relative pb-6 pl-7 last:pb-0 sm:pl-9">
                  <span class="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white" :class="a.end ? 'bg-stone-300' : 'bg-teal-600'" aria-hidden="true" />
                  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <span class="font-semibold text-stone-900">{{ a.roleDescription && a.role === 'other' ? a.roleDescription : ROLE_LABEL[a.role] }}</span>
                    <NuxtLink :to="`/episcopado/jurisdicao/${a.jurisdiction.id}`" class="ep-link">{{ a.jurisdiction.name }}</NuxtLink>
                    <template v-if="a.diocese">
                      <span class="text-stone-400" aria-hidden="true">›</span>
                      <NuxtLink :to="`/episcopado/jurisdicao/${a.diocese.id}`" class="ep-link">{{ a.diocese.name }}</NuxtLink>
                    </template>
                    <EpiscopadoStatus :status="a.status" />
                    <EpiscopadoCites :cites="a.cites" />
                  </div>
                  <p class="mt-0.5 text-sm text-stone-500">
                    {{ formatPeriod(a.start, a.end) || 'período não registrado' }}
                    <span v-if="a.endReason"> · {{ END_REASON_LABEL[a.endReason] }}</span>
                  </p>
                  <details v-if="a.notes" class="mt-1 text-sm">
                    <summary class="cursor-pointer text-stone-500 hover:text-stone-800">Notas de pesquisa</summary>
                    <p class="mt-1 whitespace-pre-line rounded-md bg-stone-50 px-3 py-2 text-stone-600">{{ a.notes }}</p>
                  </details>
                  <EpiscopadoDiscrepancies :items="a.discrepancies" />
                </li>
              </ol>
            </section>

            <!-- Eventos -->
            <section v-if="person.events.length" id="eventos" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-4">Eventos</h2>
              <ul class="space-y-3">
                <li v-for="(e, i) in person.events" :key="i" class="flex gap-3 text-sm">
                  <span class="w-24 shrink-0 pt-0.5 text-right text-xs tabular-nums text-stone-500 sm:w-28 sm:text-sm">{{ formatDate(e.date) || '—' }}</span>
                  <div class="min-w-0 flex-1 border-l border-stone-200 pl-3">
                    <p class="flex flex-wrap items-baseline gap-x-2">
                      <span class="font-semibold text-stone-900">{{ EVENT_LABEL[e.type as keyof typeof EVENT_LABEL] }}</span>
                      <NuxtLink v-if="e.jurisdiction" :to="`/episcopado/jurisdicao/${e.jurisdiction.id}`" class="text-stone-500 hover:underline">{{ e.jurisdiction.acronym ?? e.jurisdiction.name }}</NuxtLink>
                      <EpiscopadoStatus :status="e.status" :show-confirmed="false" />
                      <EpiscopadoCites :cites="e.cites" />
                    </p>
                    <p class="mt-0.5 text-stone-700">{{ e.description }}</p>
                    <EpiscopadoDiscrepancies :items="e.discrepancies" />
                  </div>
                </li>
              </ul>
            </section>

            <EpiscopadoFootnotes :footnotes="person.footnotes" />
          </div>
        </article>
      </div>

      <p class="mt-6 text-center text-xs text-stone-500">
        Encontrou um erro ou tem uma fonte? Esta base está em construção — toda correção com fonte é bem-vinda.
      </p>
    </main>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { END_REASON_LABEL, EVENT_LABEL, ORDER_LABEL, ROLE_LABEL, formatDate, formatPeriod } from '../../../lib/labels'
import type { OrdainedView, PersonView } from '../../../lib/views'
import type { TocItem } from '../../../components/episcopado/EpiscopadoToc.vue'

definePageMeta({ layout: false })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: graph } = await useEpiscopadoGraph()
const { data, error, refresh } = await useFetch<PersonView | { redirect: string }>(() => `/api/episcopado/pessoa/${id.value}`)

if (data.value && 'redirect' in data.value) await navigateTo(`/episcopado/pessoa/${data.value.redirect}`, { redirectCode: 301 })

const notFound = computed(() => error.value?.statusCode === 404)
const loadError = computed(() => (error.value && !notFound.value ? error.value : null))
if (notFound.value && import.meta.server) setResponseStatus(useRequestEvent()!, 404)

const person = computed(() => (data.value && !('redirect' in data.value) ? data.value : null))
provideEpiscopadoFootnotes(computed(() => person.value?.footnotes ?? []))

const consecration = computed(() => person.value?.ordinations.find((o) => o.order === 'episcopate') ?? null)

const kicker = computed(() => {
  const p = person.value
  if (!p) return ''
  const orders = new Set(p.ordinations.map((o) => o.order))
  const label = orders.has('episcopate') ? 'Bispo' : orders.has('presbyterate') ? 'Presbítero' : orders.has('diaconate') ? 'Diácono' : p.ordained.length ? 'Bispo · inferido' : 'Pessoa'
  const roles = currentRoles.value.map((r) => r.jurisdiction.acronym ?? r.jurisdiction.name)
  return [label, ...new Set(roles)].join(' · ')
})

const lifeDates = computed(() => {
  const p = person.value
  if (!p?.birth?.date && !p?.death?.date) return ''
  const birth = formatDate(p.birth?.date)
  const death = formatDate(p.death?.date)
  if (birth && death) return `${birth} – ${death}`
  if (birth) return `Nascimento: ${birth}${p.birth?.place ? `, ${p.birth.place}` : ''}`
  return `Falecimento: ${death}${p.death?.place ? `, ${p.death.place}` : ''}`
})

/** Notas de nascimento e falecimento, sem repetir número. */
const lifeCites = computed(() => [...new Set([...(person.value?.birth?.cites ?? []), ...(person.value?.death?.cites ?? [])])])

/** Vínculos sem data de fim, do mais alto para o mais baixo. */
const currentRoles = computed(() =>
  (person.value?.affiliations ?? [])
    .filter((a) => !a.end && a.start)
    .map((a) => ({ role: a.roleDescription && a.role === 'other' ? a.roleDescription : ROLE_LABEL[a.role], jurisdiction: a.diocese ?? a.jurisdiction }))
    .slice(-3)
    .reverse()
)

const contestedCount = computed(() => {
  const p = person.value
  if (!p) return 0
  return [...p.ordinations, ...p.affiliations, ...p.events].filter((c) => c.status === 'contested').length
})

const ordainedGroups = computed(() => {
  const list = person.value?.ordained ?? []
  const groups: { title: string; items: OrdainedView[] }[] = [
    { title: 'Sagrou como sagrante principal', items: list.filter((o) => o.role === 'principal') },
    { title: 'Co-sagrou', items: list.filter((o) => o.role === 'co') },
    { title: 'Ordenou presbíteros', items: list.filter((o) => o.role === 'ordainer' && o.order === 'presbyterate') },
    { title: 'Ordenou diáconos', items: list.filter((o) => o.role === 'ordainer' && o.order === 'diaconate') }
  ]
  return groups.filter((g) => g.items.length)
})

const toc = computed<TocItem[]>(() => {
  const p = person.value
  if (!p) return []
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

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Link'
  }
}

useSeoMeta({
  title: () => `${person.value?.name ?? 'Pessoa'} - Rede do Episcopado Histórico`,
  description: () => person.value?.biography?.slice(0, 160) ?? `${person.value ? ORDER_LABEL[person.value.ordinations[0]?.order ?? 'episcopate'] : 'Ficha'} na Rede do Episcopado Histórico.`,
  robots: 'noindex, nofollow'
})
</script>
