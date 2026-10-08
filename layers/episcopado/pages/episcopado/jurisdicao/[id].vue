<template>
  <div class="episcopado flex min-h-screen flex-col bg-ep-card">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <EpiscopadoNotFound v-if="notFound" :id="id" kind="Jurisdição" :nodes="graph.nodes" only="jurisdiction" />

    <main v-else-if="loadError" class="mx-auto max-w-2xl flex-1 px-4 py-16 text-center" role="alert">
      <h1 class="font-ep-serif text-3xl font-semibold text-ep-ink">Não foi possível carregar esta ficha</h1>
      <p class="mt-2 text-ep-body">{{ loadError.message }}</p>
      <button type="button" class="ep-btn ep-btn-primary mt-6" @click="refresh()">Tentar de novo</button>
    </main>

    <main v-else-if="j" class="flex-1">
      <EpiscopadoJurisdictionFicha :jurisdiction="j" />
    </main>
    <BaseFooter />
  </div>
</template>

<script setup lang="ts">
import type { JurisdictionView } from '../../../lib/views'

definePageMeta({ layout: false })
useEpiscopadoFonts()

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: graph } = await useEpiscopadoGraph()
const { data, error, refresh } = await useFetch<JurisdictionView | { redirect: string }>(() => `/api/episcopado/jurisdicao/${id.value}`)

if (data.value && 'redirect' in data.value) await navigateTo(`/episcopado/jurisdicao/${data.value.redirect}`, { redirectCode: 301 })

const notFound = computed(() => error.value?.statusCode === 404)
const loadError = computed(() => (error.value && !notFound.value ? error.value : null))
if (notFound.value && import.meta.server) setResponseStatus(useRequestEvent()!, 404)

const j = computed(() => (data.value && !('redirect' in data.value) ? data.value : null))

useSeoMeta({
  title: () => `${j.value?.acronym ?? j.value?.name ?? 'Jurisdição'} - Rede do Episcopado Histórico`,
  description: () => j.value?.description?.slice(0, 160) ?? 'Ficha na Rede do Episcopado Histórico.',
  robots: 'noindex, nofollow'
})
</script>
