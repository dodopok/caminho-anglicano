<template>
  <div class="min-h-screen bg-stone-50">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <main v-if="person" class="max-w-4xl mx-auto px-4 py-8">
      <article class="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-10">
        <header class="border-b border-stone-200 pb-6">
          <p class="text-xs uppercase tracking-wide text-amber-800 font-semibold">{{ highestOrder }}</p>
          <h1 class="font-serif text-4xl sm:text-5xl font-semibold text-stone-900 mt-1">{{ person.name }}</h1>
          <p v-if="person.fullName && person.fullName !== person.name" class="mt-1 text-stone-600">{{ person.fullName }}</p>
          <p v-if="lifeDates" class="mt-1 text-stone-500 text-sm">{{ lifeDates }}</p>
          <p v-if="person.aliases.length" class="mt-2 text-xs text-stone-500">Também: {{ person.aliases.join(' · ') }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-sm">
            <NuxtLink :to="`/episcopado?no=p:${person.id}`" class="inline-flex px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 font-medium">Ver na rede</NuxtLink>
            <a v-if="person.wikidata" :href="`https://www.wikidata.org/wiki/${person.wikidata}`" target="_blank" rel="noopener" class="inline-flex px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50">Wikidata</a>
          </div>
        </header>

        <section v-if="person.biography" class="mt-6">
          <p class="text-stone-700 leading-relaxed">{{ person.biography }}<EpiscopadoCites :cites="person.biographyCites" /></p>
        </section>

        <!-- Ordenações -->
        <section class="mt-8">
          <h2 class="section-title">Ordenações</h2>
          <p v-if="!person.ordinations.length" class="text-stone-500 text-sm">Nenhuma ordenação registrada ainda.</p>
          <ol class="relative border-l-2 border-amber-200 ml-2 space-y-6">
            <li v-for="(o, i) in person.ordinations" :key="i" class="pl-5 relative">
              <span class="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-600 ring-4 ring-white" />
              <div class="flex flex-wrap items-baseline gap-x-2">
                <h3 class="font-semibold text-stone-900">{{ ORDER_LABEL[o.order] }}</h3>
                <span class="text-stone-600">{{ formatDate(o.date) || 'data desconhecida' }}</span>
                <EpiscopadoStatus :status="o.status" />
                <EpiscopadoCites :cites="o.cites" />
              </div>
              <dl class="mt-1 text-sm text-stone-700 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                <template v-if="o.office">
                  <dt class="text-stone-500">Cargo</dt><dd>{{ OFFICE_LABEL[o.office] }}</dd>
                </template>
                <template v-if="o.jurisdiction">
                  <dt class="text-stone-500">Jurisdição</dt>
                  <dd><NuxtLink :to="`/episcopado/jurisdicao/${o.jurisdiction.id}`" class="link">{{ o.jurisdiction.name }}</NuxtLink></dd>
                </template>
                <template v-if="o.place">
                  <dt class="text-stone-500">Local</dt><dd>{{ o.place }}</dd>
                </template>
                <template v-if="o.order === 'episcopate'">
                  <dt class="text-stone-500">Sagrante</dt>
                  <dd>
                    <NuxtLink v-if="o.principalConsecrator" :to="`/episcopado/pessoa/${o.principalConsecrator.id}`" class="link">{{ o.principalConsecrator.name }}</NuxtLink>
                    <span v-else class="text-stone-400">desconhecido</span>
                  </dd>
                  <template v-if="o.coConsecrators.length">
                    <dt class="text-stone-500">Co-sagrantes</dt>
                    <dd>
                      <template v-for="(c, k) in o.coConsecrators" :key="c.id">
                        <NuxtLink :to="`/episcopado/pessoa/${c.id}`" class="link">{{ c.name }}</NuxtLink><span v-if="k < o.coConsecrators.length - 1">, </span>
                      </template>
                    </dd>
                  </template>
                </template>
                <template v-else>
                  <dt class="text-stone-500">Ordenante</dt>
                  <dd>
                    <NuxtLink v-if="o.ordainedBy" :to="`/episcopado/pessoa/${o.ordainedBy.id}`" class="link">{{ o.ordainedBy.name }}</NuxtLink>
                    <span v-else class="text-stone-400">desconhecido</span>
                  </dd>
                </template>
              </dl>
              <p v-if="o.notes" class="mt-1 text-sm text-stone-500">{{ o.notes }}</p>
              <EpiscopadoDiscrepancies :items="o.discrepancies" />
            </li>
          </ol>
        </section>

        <!-- Linha de sucessão -->
        <section v-if="person.succession.length > 1 || person.successionEnd === 'unknown_consecrator'" class="mt-10">
          <h2 class="section-title">Linha de sucessão</h2>
          <p class="text-sm text-stone-500 mb-3">Pelos sagrantes principais, do mais recente ao mais antigo registrado.</p>
          <ol class="space-y-1">
            <li v-for="(s, i) in person.succession" :key="s.person.id" class="flex items-center gap-3">
              <span class="w-6 text-right text-xs text-stone-400 tabular-nums">{{ i }}</span>
              <NuxtLink v-if="i > 0" :to="`/episcopado/pessoa/${s.person.id}`" class="link">{{ s.person.name }}</NuxtLink>
              <span v-else class="font-medium text-stone-900">{{ s.person.name }}</span>
              <span class="text-xs text-stone-500">{{ s.date ? `sagrado ${formatDate(s.date)}` : '' }}</span>
              <EpiscopadoStatus v-if="s.status" :status="s.status" />
            </li>
          </ol>
          <p class="mt-3 text-sm text-stone-500">
            <template v-if="person.successionEnd === 'unknown_consecrator'">A linha para aqui: o sagrante de {{ person.succession.at(-1)?.person.name }} ainda não foi registrado.</template>
            <template v-else-if="person.successionEnd === 'no_episcopate'">A linha para aqui: a sagração de {{ person.succession.at(-1)?.person.name }} ainda não foi registrada.</template>
            <template v-else-if="person.successionEnd === 'cycle'">A linha encontrou um ciclo nos dados e foi interrompida.</template>
          </p>
        </section>

        <!-- Quem ordenou/sagrou -->
        <section v-if="person.ordained.length" class="mt-10">
          <h2 class="section-title">Ordenou e sagrou</h2>
          <ul class="divide-y divide-stone-100">
            <li v-for="(o, i) in person.ordained" :key="i" class="py-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
              <NuxtLink :to="`/episcopado/pessoa/${o.person.id}`" class="link font-medium">{{ o.person.name }}</NuxtLink>
              <span class="text-stone-600">{{ ordainedLabel(o) }}</span>
              <span class="text-stone-500">{{ formatDate(o.date) }}</span>
              <span v-if="o.jurisdiction" class="text-stone-500">· {{ o.jurisdiction.acronym ?? o.jurisdiction.name }}</span>
              <EpiscopadoStatus :status="o.status" />
            </li>
          </ul>
        </section>

        <!-- Vínculos -->
        <section v-if="person.affiliations.length" class="mt-10">
          <h2 class="section-title">Trajetória</h2>
          <ul class="space-y-3">
            <li v-for="(a, i) in person.affiliations" :key="i" class="text-sm">
              <div class="flex flex-wrap items-baseline gap-x-2">
                <span class="font-medium text-stone-900">{{ a.roleDescription && a.role === 'other' ? a.roleDescription : ROLE_LABEL[a.role] }}</span>
                <NuxtLink :to="`/episcopado/jurisdicao/${a.jurisdiction.id}`" class="link">{{ a.jurisdiction.name }}</NuxtLink>
                <template v-if="a.diocese">
                  <span class="text-stone-400">›</span>
                  <NuxtLink :to="`/episcopado/jurisdicao/${a.diocese.id}`" class="link">{{ a.diocese.name }}</NuxtLink>
                </template>
                <span class="text-stone-500">{{ formatPeriod(a.start, a.end) }}</span>
                <span v-if="a.endReason" class="text-stone-500">({{ END_REASON_LABEL[a.endReason] }})</span>
                <EpiscopadoStatus :status="a.status" />
                <EpiscopadoCites :cites="a.cites" />
              </div>
              <p v-if="a.notes" class="text-stone-500 mt-0.5">{{ a.notes }}</p>
              <EpiscopadoDiscrepancies :items="a.discrepancies" />
            </li>
          </ul>
        </section>

        <!-- Eventos -->
        <section v-if="person.events.length" class="mt-10">
          <h2 class="section-title">Eventos</h2>
          <ul class="space-y-2 text-sm">
            <li v-for="(e, i) in person.events" :key="i">
              <span class="font-medium text-stone-900">{{ EVENT_LABEL[e.type as keyof typeof EVENT_LABEL] }}</span>
              <span class="text-stone-500"> {{ formatDate(e.date) }}</span> —
              <span class="text-stone-700">{{ e.description }}</span>
              <EpiscopadoStatus :status="e.status" />
              <EpiscopadoCites :cites="e.cites" />
            </li>
          </ul>
        </section>

        <EpiscopadoFootnotes :footnotes="person.footnotes" />
      </article>

      <p class="mt-6 text-xs text-stone-500 text-center">
        Encontrou um erro ou tem uma fonte? Esta base está em construção — toda correção com fonte é bem-vinda.
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  END_REASON_LABEL,
  EVENT_LABEL,
  OFFICE_LABEL,
  ORDER_LABEL,
  ROLE_LABEL,
  formatDate,
  formatPeriod
} from '../../../lib/labels'
import type { OrdainedView, PersonView } from '../../../lib/views'

definePageMeta({ layout: false })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: graph } = await useEpiscopadoGraph()
const { data, error } = await useFetch<PersonView | { redirect: string }>(() => `/api/episcopado/pessoa/${id.value}`)

if (error.value) throw createError({ statusCode: 404, statusMessage: 'Pessoa não encontrada', fatal: true })
if (data.value && 'redirect' in data.value) await navigateTo(`/episcopado/pessoa/${data.value.redirect}`, { redirectCode: 301 })

const person = computed(() => (data.value && !('redirect' in data.value) ? data.value : null))

const highestOrder = computed(() => {
  const orders = new Set(person.value?.ordinations.map((o) => o.order))
  if (orders.has('episcopate')) return 'Bispo'
  if (orders.has('presbyterate')) return 'Presbítero'
  if (orders.has('diaconate')) return 'Diácono'
  return 'Pessoa'
})

const lifeDates = computed(() => {
  const p = person.value
  if (!p?.birth?.date && !p?.death?.date) return ''
  return `${formatDate(p.birth?.date) || '?'} – ${formatDate(p.death?.date) || ''}`.trim()
})

function ordainedLabel(o: OrdainedView): string {
  if (o.order === 'episcopate') return o.role === 'principal' ? 'sagrado (sagrante principal)' : 'sagrado (co-sagrante)'
  return o.order === 'presbyterate' ? 'ordenado presbítero' : 'ordenado diácono'
}

useSeoMeta({
  title: () => `${person.value?.name ?? 'Pessoa'} - Rede do Episcopado Histórico`,
  description: () => person.value?.biography?.slice(0, 160) ?? 'Ficha na Rede do Episcopado Histórico.',
  robots: 'noindex, nofollow'
})
</script>

<style scoped>
.section-title {
  @apply font-serif text-2xl font-semibold text-stone-900 mb-3;
}
.link {
  @apply text-amber-800 hover:text-amber-950 underline decoration-amber-200 underline-offset-2 hover:decoration-amber-500;
}
</style>
