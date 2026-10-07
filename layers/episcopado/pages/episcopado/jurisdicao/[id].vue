<template>
  <div class="episcopado flex min-h-screen flex-col bg-stone-50">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <EpiscopadoNotFound v-if="notFound" :id="id" kind="Jurisdição" :nodes="graph.nodes" only="jurisdiction" />

    <main v-else-if="loadError" class="mx-auto max-w-2xl px-4 py-16 text-center" role="alert">
      <h1 class="font-serif text-3xl font-semibold text-stone-900">Não foi possível carregar esta ficha</h1>
      <p class="mt-2 text-stone-600">{{ loadError.message }}</p>
      <button type="button" class="ep-btn ep-btn-primary mt-6" @click="refresh()">Tentar de novo</button>
    </main>

    <main v-else-if="j" class="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <nav aria-label="Você está em" class="mb-4 text-xs text-stone-500">
        <ol class="flex flex-wrap items-center gap-1">
          <li><NuxtLink to="/episcopado" class="hover:text-stone-800 hover:underline">Rede do Episcopado</NuxtLink></li>
          <li aria-hidden="true">›</li>
          <li>Jurisdição</li>
          <li aria-hidden="true">›</li>
          <li class="text-stone-800" aria-current="page">{{ j.acronym ?? j.name }}</li>
        </ol>
      </nav>

      <div class="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <aside class="mb-4 lg:mb-0">
          <div class="lg:sticky lg:top-20">
            <EpiscopadoToc :items="toc" />
            <div class="mt-4 hidden rounded-xl border border-stone-200 bg-white p-4 text-xs text-stone-600 lg:block">
              <p class="font-semibold uppercase tracking-wide text-stone-400">Como ler</p>
              <p class="mt-1.5">Cada [n] abre a fonte e o trecho que sustenta a afirmação. Os selos indicam o grau de certeza.</p>
              <ul class="mt-2 space-y-1">
                <li v-for="s in (['confirmed', 'probable', 'contested'] as const)" :key="s"><EpiscopadoStatus :status="s" /></li>
              </ul>
            </div>
          </div>
        </aside>

        <article class="min-w-0 rounded-2xl border border-stone-200 bg-white shadow-sm">
          <header class="border-b border-stone-200 px-5 pb-6 pt-6 sm:px-10 sm:pt-8">
            <p class="text-xs font-semibold uppercase tracking-wide text-teal-800">
              {{ [JURISDICTION_TYPE_LABEL[j.type], j.tradition ? TRADITION_LABEL[j.tradition] : '', countryName(j.country)].filter(Boolean).join(' · ') }}
            </p>
            <h1 class="mt-1 font-serif text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">{{ j.acronym ?? j.name }}</h1>
            <p v-if="j.acronym" class="mt-1 text-lg text-stone-600">{{ j.name }}</p>
            <p v-if="j.aliases.length" class="mt-2 text-xs text-stone-500">
              Também: <span v-for="(a, i) in j.aliases" :key="a">{{ a }}<template v-if="i < j.aliases.length - 1"> · </template></span>
            </p>

            <div class="mt-5 flex flex-wrap gap-2">
              <NuxtLink :to="`/episcopado?no=j:${j.id}`" class="ep-btn ep-btn-primary">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a3 3 0 00-1 5.83V9H6a3 3 0 100 2h3v1.17a3 3 0 101 0V11h3a3 3 0 100-2h-3V7.83A3 3 0 0010 2z" /></svg>
                Ver na rede
              </NuxtLink>
              <NuxtLink v-if="j.locatorSlug" :to="`/igrejas/${j.locatorSlug}`" class="ep-btn ep-btn-secondary">Igrejas no Localizador</NuxtLink>
              <a v-if="j.website" :href="j.website" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary">Site oficial ↗</a>
              <a v-if="j.wikidata" :href="`https://www.wikidata.org/wiki/${j.wikidata}`" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary">Wikidata ↗</a>
            </div>

            <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div v-if="j.founded?.date">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Fundação</dt>
                <dd class="mt-0.5 font-medium text-stone-900">{{ formatDate(j.founded.date) }}<EpiscopadoCites :cites="j.founded.cites" /></dd>
              </div>
              <div v-if="j.dissolved?.date">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Extinção</dt>
                <dd class="mt-0.5 font-medium text-stone-900">{{ formatDate(j.dissolved.date) }}<EpiscopadoCites :cites="j.dissolved.cites" /></dd>
              </div>
              <div v-if="origin">
                <dt class="text-xs uppercase tracking-wide text-stone-400">{{ RELATION_LABEL[origin.type] }}</dt>
                <dd class="mt-0.5 font-medium"><NuxtLink :to="`/episcopado/jurisdicao/${origin.other.id}`" class="ep-link">{{ origin.other.acronym ?? origin.other.name }}</NuxtLink><span v-if="origin.date" class="font-normal text-stone-500"> ({{ formatDate(origin.date) }})</span></dd>
              </div>
              <div v-if="bishops.length">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Bispos e primazes</dt>
                <dd class="mt-0.5 font-medium text-stone-900"><a href="#bispos" class="ep-link">{{ bishops.length }}</a></dd>
              </div>
              <div v-if="children.length">
                <dt class="text-xs uppercase tracking-wide text-stone-400">Deu origem a</dt>
                <dd class="mt-0.5 font-medium text-stone-900"><a href="#origem" class="ep-link">{{ children.length }} {{ children.length === 1 ? 'jurisdição' : 'jurisdições' }}</a></dd>
              </div>
              <div>
                <dt class="text-xs uppercase tracking-wide text-stone-400">Fontes</dt>
                <dd class="mt-0.5 font-medium text-stone-900"><a href="#fontes" class="ep-link">{{ j.footnotes.length }} {{ j.footnotes.length === 1 ? 'nota' : 'notas' }}</a></dd>
              </div>
            </dl>
          </header>

          <div class="px-5 py-6 sm:px-10 sm:py-8">
            <section id="resumo" class="scroll-mt-24">
              <h2 class="ep-section-title sr-only">Resumo</h2>
              <p v-if="j.description" class="text-[17px] leading-relaxed text-stone-800">{{ j.description }}<EpiscopadoCites :cites="j.descriptionCites" /></p>
              <p v-else class="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-500">Ainda não há descrição registrada.</p>
            </section>

            <!-- Origem e relações -->
            <section v-if="j.relations.length || j.inbound.length" id="origem" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-4">Origem e relações</h2>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div v-for="group in relationGroups" :key="group.title" class="rounded-xl border border-stone-200 p-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wide text-stone-500">{{ group.title }}</h3>
                  <ul class="mt-2 space-y-3">
                    <li v-for="(r, i) in group.items" :key="i" class="text-sm">
                      <div class="flex flex-wrap items-baseline gap-x-2">
                        <span v-if="group.showLabel" class="text-stone-500">{{ r.label }}</span>
                        <NuxtLink :to="`/episcopado/jurisdicao/${r.other.id}`" class="ep-link font-medium">{{ r.other.acronym ?? r.other.name }}</NuxtLink>
                        <span v-if="r.date || r.end" class="text-stone-500">{{ formatPeriod(r.date, r.end).replace(/^desde /, '') }}</span>
                        <EpiscopadoStatus :status="r.status" />
                        <EpiscopadoCites :cites="r.cites" />
                      </div>
                      <p v-if="r.other.acronym" class="text-xs text-stone-500">{{ r.other.name }}</p>
                      <p v-if="r.ledBy.length" class="mt-0.5 text-xs text-stone-600">
                        Liderada por
                        <template v-for="(p, k) in r.ledBy" :key="p.id"><NuxtLink :to="`/episcopado/pessoa/${p.id}`" class="ep-link">{{ p.name }}</NuxtLink><template v-if="k < r.ledBy.length - 1">, </template></template>
                      </p>
                      <p v-if="r.notes" class="mt-0.5 text-xs text-stone-500">{{ r.notes }}</p>
                      <EpiscopadoDiscrepancies :items="r.discrepancies" />
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <!-- Bispos -->
            <section v-if="bishops.length" id="bispos" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-1">Bispos, primazes e fundadores</h2>
              <p class="mb-4 text-sm text-stone-500">Em ordem de início do vínculo.</p>
              <ol class="relative ml-3 border-l-2 border-teal-200 sm:ml-4">
                <li v-for="(m, i) in bishops" :key="i" class="relative pb-5 pl-7 last:pb-0 sm:pl-9">
                  <span class="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white" :class="m.end ? 'bg-stone-300' : 'bg-teal-600'" aria-hidden="true" />
                  <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <NuxtLink :to="`/episcopado/pessoa/${m.person.id}`" class="ep-link font-semibold">{{ m.person.name }}</NuxtLink>
                    <span class="text-stone-700">{{ m.roleDescription && m.role === 'other' ? m.roleDescription : ROLE_LABEL[m.role] }}</span>
                    <NuxtLink v-if="m.diocese" :to="`/episcopado/jurisdicao/${m.diocese.id}`" class="text-stone-500 hover:underline">· {{ m.diocese.acronym ?? m.diocese.name }}</NuxtLink>
                    <EpiscopadoStatus :status="m.status" :show-confirmed="false" />
                    <EpiscopadoCites :cites="m.cites" />
                  </div>
                  <p class="mt-0.5 text-sm text-stone-500">
                    {{ formatPeriod(m.start, m.end) || 'período não registrado' }}<span v-if="m.endReason"> · {{ END_REASON_LABEL[m.endReason] }}</span>
                  </p>
                  <EpiscopadoDiscrepancies :items="m.discrepancies" />
                </li>
              </ol>
            </section>

            <!-- Clero e membros -->
            <section v-if="clergy.length" id="clero" class="mt-10 scroll-mt-24">
              <h2 class="ep-section-title mb-4">Clero e membros</h2>
              <ul class="divide-y divide-stone-100 rounded-lg border border-stone-100">
                <li v-for="(m, i) in clergy" :key="i" class="flex flex-wrap items-baseline gap-x-2 px-3 py-2 text-sm">
                  <NuxtLink :to="`/episcopado/pessoa/${m.person.id}`" class="ep-link font-medium">{{ m.person.name }}</NuxtLink>
                  <span class="text-stone-600">{{ m.roleDescription && m.role === 'other' ? m.roleDescription : ROLE_LABEL[m.role] }}</span>
                  <NuxtLink v-if="m.diocese" :to="`/episcopado/jurisdicao/${m.diocese.id}`" class="text-stone-500 hover:underline">· {{ m.diocese.acronym ?? m.diocese.name }}</NuxtLink>
                  <span class="text-stone-500">{{ formatPeriod(m.start, m.end) }}</span>
                  <span v-if="m.endReason" class="text-stone-500">({{ END_REASON_LABEL[m.endReason] }})</span>
                  <EpiscopadoStatus :status="m.status" :show-confirmed="false" />
                  <EpiscopadoCites :cites="m.cites" />
                </li>
              </ul>
            </section>

            <EpiscopadoFootnotes :footnotes="j.footnotes" />
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
import {
  END_REASON_LABEL,
  JURISDICTION_TYPE_LABEL,
  RELATION_INVERSE_LABEL,
  RELATION_LABEL,
  ROLE_LABEL,
  TRADITION_LABEL,
  countryName,
  formatDate,
  formatPeriod
} from '../../../lib/labels'
import type { JurisdictionView, RelationView } from '../../../lib/views'
import type { TocItem } from '../../../components/episcopado/EpiscopadoToc.vue'

definePageMeta({ layout: false })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: graph } = await useEpiscopadoGraph()
const { data, error, refresh } = await useFetch<JurisdictionView | { redirect: string }>(() => `/api/episcopado/jurisdicao/${id.value}`)

if (data.value && 'redirect' in data.value) await navigateTo(`/episcopado/jurisdicao/${data.value.redirect}`, { redirectCode: 301 })

const notFound = computed(() => error.value?.statusCode === 404)
const loadError = computed(() => (error.value && !notFound.value ? error.value : null))
if (notFound.value && import.meta.server) setResponseStatus(useRequestEvent()!, 404)

const j = computed(() => (data.value && !('redirect' in data.value) ? data.value : null))
provideEpiscopadoFootnotes(computed(() => j.value?.footnotes ?? []))

const EPISCOPAL = new Set(['bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop', 'founder'])
const ORIGIN_TYPES = new Set(['schism_from', 'successor_of', 'part_of', 'merged_with'])

const bishops = computed(() => (j.value?.members ?? []).filter((m) => EPISCOPAL.has(m.role)))
const clergy = computed(() => (j.value?.members ?? []).filter((m) => !EPISCOPAL.has(m.role)))

/** A relação que explica de onde a jurisdição veio (cisma, sucessão...). */
const origin = computed(() => j.value?.relations.find((r) => r.type === 'schism_from' || r.type === 'successor_of') ?? null)
const children = computed(() => (j.value?.inbound ?? []).filter((r) => r.type === 'schism_from' || r.type === 'successor_of'))

type Labeled = RelationView & { label: string }
const relationGroups = computed(() => {
  const v = j.value
  if (!v) return []
  const out = v.relations.map((r): Labeled => ({ ...r, label: RELATION_LABEL[r.type] }))
  const inbound = v.inbound.map((r): Labeled => ({ ...r, label: RELATION_INVERSE_LABEL[r.type] }))
  const groups = [
    { title: 'De onde veio', showLabel: true, items: out.filter((r) => ORIGIN_TYPES.has(r.type)) },
    { title: 'Deu origem a / inclui', showLabel: true, items: inbound.filter((r) => ORIGIN_TYPES.has(r.type)) },
    { title: 'Comunhões e reconhecimento', showLabel: true, items: out.filter((r) => !ORIGIN_TYPES.has(r.type)) },
    { title: 'Reconhecida ou acompanhada por', showLabel: true, items: inbound.filter((r) => !ORIGIN_TYPES.has(r.type)) }
  ]
  return groups.filter((g) => g.items.length)
})

const toc = computed<TocItem[]>(() => {
  const v = j.value
  if (!v) return []
  return [
    { id: 'resumo', label: 'Resumo' },
    ...(v.relations.length || v.inbound.length ? [{ id: 'origem', label: 'Origem e relações', count: v.relations.length + v.inbound.length }] : []),
    ...(bishops.value.length ? [{ id: 'bispos', label: 'Bispos', count: bishops.value.length }] : []),
    ...(clergy.value.length ? [{ id: 'clero', label: 'Clero e membros', count: clergy.value.length }] : []),
    { id: 'fontes', label: 'Fontes', count: v.footnotes.length }
  ]
})

useSeoMeta({
  title: () => `${j.value?.acronym ?? j.value?.name ?? 'Jurisdição'} - Rede do Episcopado Histórico`,
  description: () => j.value?.description?.slice(0, 160) ?? 'Ficha na Rede do Episcopado Histórico.',
  robots: 'noindex, nofollow'
})
</script>
