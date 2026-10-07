<template>
  <div class="min-h-screen bg-stone-50">
    <EpiscopadoHeader :nodes="graph.nodes" />

    <main v-if="j" class="max-w-4xl mx-auto px-4 py-8">
      <article class="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-10">
        <header class="border-b border-stone-200 pb-6">
          <p class="text-xs uppercase tracking-wide text-teal-800 font-semibold">
            {{ JURISDICTION_TYPE_LABEL[j.type] }}<template v-if="j.tradition"> · {{ TRADITION_LABEL[j.tradition] }}</template><template v-if="j.country"> · {{ j.country }}</template>
          </p>
          <h1 class="font-serif text-4xl sm:text-5xl font-semibold text-stone-900 mt-1">{{ j.acronym ?? j.name }}</h1>
          <p v-if="j.acronym" class="mt-1 text-stone-600">{{ j.name }}</p>
          <p class="mt-1 text-sm text-stone-500">
            <template v-if="j.founded?.date">Fundação: {{ formatDate(j.founded.date) }}<EpiscopadoCites :cites="j.founded.cites" /></template>
            <template v-if="j.dissolved?.date"> · Extinção: {{ formatDate(j.dissolved.date) }}<EpiscopadoCites :cites="j.dissolved.cites" /></template>
          </p>
          <p v-if="j.aliases.length" class="mt-2 text-xs text-stone-500">Também: {{ j.aliases.join(' · ') }}</p>
          <div class="mt-4 flex flex-wrap gap-2 text-sm">
            <NuxtLink :to="`/episcopado?no=j:${j.id}`" class="inline-flex px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 font-medium">Ver na rede</NuxtLink>
            <NuxtLink v-if="j.locatorSlug" :to="`/igrejas/${j.locatorSlug}`" class="inline-flex px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50">Ver igrejas no Localizador</NuxtLink>
            <a v-if="j.website" :href="j.website" target="_blank" rel="noopener" class="inline-flex px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50">Site oficial</a>
            <a v-if="j.wikidata" :href="`https://www.wikidata.org/wiki/${j.wikidata}`" target="_blank" rel="noopener" class="inline-flex px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50">Wikidata</a>
          </div>
        </header>

        <section v-if="j.description" class="mt-6">
          <p class="text-stone-700 leading-relaxed">{{ j.description }}<EpiscopadoCites :cites="j.descriptionCites" /></p>
        </section>

        <section v-if="j.relations.length || j.inbound.length" class="mt-8">
          <h2 class="section-title">Origem e relações</h2>
          <ul class="space-y-3 text-sm">
            <li v-for="(r, i) in j.relations" :key="`o${i}`">
              <RelationLine :label="RELATION_LABEL[r.type]" :relation="r" />
            </li>
            <li v-for="(r, i) in j.inbound" :key="`i${i}`">
              <RelationLine :label="RELATION_INVERSE_LABEL[r.type]" :relation="r" />
            </li>
          </ul>
        </section>

        <section v-for="group in memberGroups" :key="group.title" class="mt-10">
          <h2 class="section-title">{{ group.title }}</h2>
          <ul class="divide-y divide-stone-100">
            <li v-for="(m, i) in group.items" :key="i" class="py-1.5 text-sm flex flex-wrap items-baseline gap-x-2">
              <NuxtLink :to="`/episcopado/pessoa/${m.person.id}`" class="link font-medium">{{ m.person.name }}</NuxtLink>
              <span class="text-stone-600">{{ m.roleDescription && m.role === 'other' ? m.roleDescription : ROLE_LABEL[m.role] }}</span>
              <NuxtLink v-if="m.diocese" :to="`/episcopado/jurisdicao/${m.diocese.id}`" class="text-stone-500 hover:underline">· {{ m.diocese.name }}</NuxtLink>
              <span class="text-stone-500">{{ formatPeriod(m.start, m.end) }}</span>
              <span v-if="m.endReason" class="text-stone-500">({{ END_REASON_LABEL[m.endReason] }})</span>
              <EpiscopadoStatus :status="m.status" />
              <EpiscopadoCites :cites="m.cites" />
            </li>
          </ul>
        </section>

        <EpiscopadoFootnotes :footnotes="j.footnotes" />
      </article>
    </main>
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
  formatDate,
  formatPeriod
} from '../../../lib/labels'
import type { JurisdictionView, MemberView, RelationView } from '../../../lib/views'

definePageMeta({ layout: false })

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: graph } = await useEpiscopadoGraph()
const { data, error } = await useFetch<JurisdictionView | { redirect: string }>(() => `/api/episcopado/jurisdicao/${id.value}`)

if (error.value) throw createError({ statusCode: 404, statusMessage: 'Jurisdição não encontrada', fatal: true })
if (data.value && 'redirect' in data.value) await navigateTo(`/episcopado/jurisdicao/${data.value.redirect}`, { redirectCode: 301 })

const j = computed(() => (data.value && !('redirect' in data.value) ? data.value : null))

const EPISCOPAL = new Set(['bishop', 'diocesan_bishop', 'coadjutor_bishop', 'suffragan_bishop', 'auxiliary_bishop', 'missionary_bishop', 'primate', 'archbishop', 'founder'])

const memberGroups = computed(() => {
  const members = j.value?.members ?? []
  const groups: { title: string; items: MemberView[] }[] = [
    { title: 'Bispos, primazes e fundadores', items: members.filter((m) => EPISCOPAL.has(m.role)) },
    { title: 'Clero e membros', items: members.filter((m) => !EPISCOPAL.has(m.role)) }
  ]
  return groups.filter((g) => g.items.length)
})

/** Linha de relação: "Cisma de IEAB (2005), liderado por Fulano [1]". */
const RelationLine = defineComponent({
  props: { label: { type: String, required: true }, relation: { type: Object as PropType<RelationView>, required: true } },
  setup(props) {
    return () => {
      const r = props.relation
      const NuxtLink = resolveComponent('NuxtLink')
      const Cites = resolveComponent('EpiscopadoCites')
      const Status = resolveComponent('EpiscopadoStatus')
      const Discrepancies = resolveComponent('EpiscopadoDiscrepancies')
      return h('div', [
        h('div', { class: 'flex flex-wrap items-baseline gap-x-2' }, [
          h('span', { class: 'text-stone-500' }, props.label),
          h(NuxtLink, { to: `/episcopado/jurisdicao/${r.other.id}`, class: 'link font-medium' }, () => r.other.acronym ?? r.other.name),
          r.date || r.end ? h('span', { class: 'text-stone-500' }, formatPeriod(r.date, r.end).replace(/^desde /, '')) : null,
          r.ledBy.length
            ? h('span', { class: 'text-stone-600' }, [
              'liderado por ',
              ...r.ledBy.flatMap((p, i) => [
                h(NuxtLink, { to: `/episcopado/pessoa/${p.id}`, class: 'link' }, () => p.name),
                i < r.ledBy.length - 1 ? ', ' : ''
              ])
            ])
            : null,
          h(Status, { status: r.status }),
          h(Cites, { cites: r.cites })
        ]),
        r.notes ? h('p', { class: 'text-stone-500 mt-0.5' }, r.notes) : null,
        h(Discrepancies, { items: r.discrepancies })
      ])
    }
  }
})

useSeoMeta({
  title: () => `${j.value?.acronym ?? j.value?.name ?? 'Jurisdição'} - Rede do Episcopado Histórico`,
  description: () => j.value?.description?.slice(0, 160) ?? 'Ficha na Rede do Episcopado Histórico.',
  robots: 'noindex, nofollow'
})
</script>

<style scoped>
.section-title {
  @apply font-serif text-2xl font-semibold text-stone-900 mb-3;
}
:deep(.link) {
  @apply text-amber-800 hover:text-amber-950 underline decoration-amber-200 underline-offset-2 hover:decoration-amber-500;
}
</style>
