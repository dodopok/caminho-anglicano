<template>
  <div class="episcopado flex min-h-screen flex-col bg-ep-paper">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <main v-if="notFound" class="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
      <p class="text-[11px] font-semibold uppercase tracking-[.08em] text-ep-muted">Fonte</p>
      <h1 class="mt-2 font-ep-serif text-4xl font-semibold text-ep-ink">Não encontramos “{{ id }}”</h1>
      <p class="mt-3 text-ep-body">Essa fonte não está na base, ou o link mudou.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-2">
        <NuxtLink to="/episcopado/fontes" class="ep-btn ep-btn-primary">Ver todas as fontes</NuxtLink>
        <NuxtLink to="/episcopado" class="ep-btn ep-btn-secondary">Ir ao explorador</NuxtLink>
      </div>
    </main>

    <main v-else-if="loadError" class="mx-auto max-w-2xl px-4 py-16 text-center" role="alert">
      <h1 class="font-ep-serif text-3xl font-semibold text-ep-ink">Não foi possível carregar esta fonte</h1>
      <p class="mt-2 text-ep-body">{{ loadError.message }}</p>
      <button type="button" class="ep-btn ep-btn-primary mt-6" @click="refresh()">Tentar de novo</button>
    </main>

    <main v-else-if="view" class="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <nav aria-label="Você está em" class="mb-4 text-xs text-ep-muted">
        <ol class="flex flex-wrap items-center gap-1">
          <li><NuxtLink to="/episcopado" class="hover:text-ep-ink hover:underline">Rede do Episcopado</NuxtLink></li>
          <li aria-hidden="true">›</li>
          <li><NuxtLink to="/episcopado/fontes" class="hover:text-ep-ink hover:underline">Fontes</NuxtLink></li>
          <li aria-hidden="true">›</li>
          <li class="truncate text-ep-ink" aria-current="page">{{ view.source.title }}</li>
        </ol>
      </nav>

      <article class="rounded-ep border border-ep-line bg-ep-card">
        <header class="border-b border-ep-line px-5 pb-6 pt-6 sm:px-10 sm:pt-8">
          <p class="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[.08em] text-ep-muted">
            <span>{{ SOURCE_TYPE_LABEL[view.source.type] }}</span>
            <span aria-hidden="true">·</span>
            <EpiscopadoTip :title="SOURCE_LEVEL_LABEL[view.source.level]" :text="SOURCE_LEVEL_DESCRIPTION[view.source.level]" placement="bottom">
              <span class="cursor-help underline decoration-dotted underline-offset-2">{{ SOURCE_LEVEL_LABEL[view.source.level] }}</span>
            </EpiscopadoTip>
            <span v-if="view.source.language" aria-hidden="true">·</span>
            <span v-if="view.source.language">{{ view.source.language.toUpperCase() }}</span>
          </p>
          <h1 class="mt-1 font-ep-serif text-3xl font-semibold leading-tight text-ep-ink sm:text-4xl">{{ view.source.title }}</h1>
          <p v-if="byline" class="mt-2 text-ep-body">{{ byline }}</p>

          <div class="mt-5 flex flex-wrap gap-2">
            <a v-if="view.source.url" :href="view.source.url" target="_blank" rel="noopener" class="ep-btn ep-btn-primary">Abrir fonte ↗</a>
            <span v-else class="ep-btn ep-btn-secondary cursor-default">Sem link público</span>
            <a v-if="view.source.archive_url" :href="view.source.archive_url" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary">Arquivo (snapshot) ↗</a>
          </div>

          <dl class="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div v-if="view.source.published">
              <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Publicação</dt>
              <dd class="mt-0.5 font-medium text-ep-ink">{{ formatDate(view.source.published) }}</dd>
            </div>
            <div v-if="view.source.accessed">
              <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Consultada em</dt>
              <dd class="mt-0.5 font-medium text-ep-ink">{{ formatDate(view.source.accessed) }}</dd>
            </div>
            <div>
              <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Sustenta</dt>
              <dd class="mt-0.5 font-medium text-ep-ink">{{ view.claims.length }} {{ view.claims.length === 1 ? 'afirmação' : 'afirmações' }}</dd>
            </div>
            <div>
              <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Em</dt>
              <dd class="mt-0.5 font-medium text-ep-ink">{{ view.entities }} {{ view.entities === 1 ? 'ficha' : 'fichas' }}</dd>
            </div>
          </dl>
          <p v-if="view.source.notes" class="mt-4 rounded-ep bg-ep-paper px-4 py-3 text-sm text-ep-body">{{ view.source.notes }}</p>
          <p v-if="view.source.url" class="mt-3 break-all text-xs text-ep-faint">{{ view.source.url }}</p>
        </header>

        <div class="px-5 py-6 sm:px-10 sm:py-8">
          <h2 class="ep-section-title">O que esta fonte sustenta</h2>
          <p class="mb-5 mt-1 text-sm text-ep-muted">Cada item mostra o trecho literal citado e leva à seção da ficha onde a afirmação aparece.</p>

          <p v-if="!view.claims.length" class="rounded-ep bg-ep-paper px-4 py-3 text-sm text-ep-muted">Esta fonte está cadastrada, mas ainda não sustenta nenhuma afirmação.</p>

          <div v-for="group in groups" :key="group.key" class="mb-8 last:mb-0">
            <h3 class="flex flex-wrap items-baseline gap-x-2">
              <span class="text-[11px] font-semibold uppercase tracking-[.08em]" :class="group.entity.kind === 'person' ? 'text-ep-garnet-ink' : 'text-ep-teal'">{{ group.entity.kind === 'person' ? 'Pessoa' : 'Jurisdição' }}</span>
              <NuxtLink :to="entityRoute(group.entity)" class="ep-link font-ep-serif text-xl font-semibold">{{ group.entity.name }}</NuxtLink>
              <span class="text-xs text-ep-faint">{{ group.items.length }} {{ group.items.length === 1 ? 'afirmação' : 'afirmações' }}</span>
            </h3>
            <ul class="mt-2 divide-y divide-ep-line-2 rounded-ep border border-ep-line">
              <li v-for="(c, i) in group.items" :key="i" class="px-4 py-3">
                <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <NuxtLink :to="`${entityRoute(group.entity)}#${c.section}`" class="font-medium text-ep-ink hover:text-ep-garnet-ink hover:underline">{{ c.claim }}</NuxtLink>
                  <span v-if="c.detail" class="text-ep-muted">{{ c.detail }}</span>
                  <EpiscopadoStatus v-if="c.status" :status="c.status" :show-confirmed="false" />
                  <span v-if="c.discrepancy" class="rounded bg-[#f3e3e1] px-1.5 py-0.5 text-[11px] font-medium text-ep-red ring-1 ring-[#e8c9c4]">versão divergente · {{ c.discrepancy }}</span>
                </div>
                <blockquote v-if="c.quote" class="mt-1.5 border-l-2 border-ep-garnet-mid pl-3 text-sm italic leading-relaxed text-ep-ink-3">“{{ c.quote }}”<span v-if="c.page" class="not-italic text-ep-muted"> (p. {{ c.page }})</span></blockquote>
                <p v-else class="mt-1 text-xs text-ep-faint">Sem trecho citado.</p>
              </li>
            </ul>
          </div>
        </div>
      </article>
    </main>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import { SOURCE_LEVEL_DESCRIPTION, SOURCE_LEVEL_LABEL, SOURCE_TYPE_LABEL, formatDate } from '../../../lib/labels'
import type { EntityRef, SourceView, SupportedClaim } from '../../../lib/views'

definePageMeta({ layout: false })
useEpiscopadoFonts()

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: graph } = await useEpiscopadoGraph()
const { data: view, error, refresh } = await useFetch<SourceView>(() => `/api/episcopado/fonte/${id.value}`)

const notFound = computed(() => error.value?.statusCode === 404)
const loadError = computed(() => (error.value && !notFound.value ? error.value : null))
if (notFound.value && import.meta.server) setResponseStatus(useRequestEvent()!, 404)

const byline = computed(() => {
  const s = view.value?.source
  return s ? [s.author, s.publisher].filter(Boolean).join(' · ') : ''
})

const entityRoute = (e: EntityRef) => (e.kind === 'person' ? `/episcopado/pessoa/${e.id}` : `/episcopado/jurisdicao/${e.id}`)

/** Afirmações agrupadas por ficha. */
const groups = computed(() => {
  const map = new Map<string, { key: string; entity: EntityRef; items: SupportedClaim[] }>()
  for (const c of view.value?.claims ?? []) {
    const key = `${c.entity.kind}:${c.entity.id}`
    const g = map.get(key) ?? { key, entity: c.entity, items: [] }
    g.items.push(c)
    map.set(key, g)
  }
  return [...map.values()]
})

useSeoMeta({
  title: () => `${view.value?.source.title ?? 'Fonte'} - Rede do Episcopado Histórico`,
  description: () => (view.value ? `${SOURCE_TYPE_LABEL[view.value.source.type]} que sustenta ${view.value.claims.length} afirmações na Rede do Episcopado Histórico.` : 'Fonte da Rede do Episcopado Histórico.'),
  robots: 'noindex, nofollow'
})
</script>
