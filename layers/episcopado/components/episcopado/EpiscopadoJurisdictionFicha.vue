<template>
  <div>
    <EpiscopadoFichaBar kind="Jurisdição" :toc="toc" :sheet="sheet" :graph-link="`/episcopado?no=j:${j.id}`" @back="emit('back')" @close="emit('close')" />

    <article class="px-5 pb-12 pt-7 min-[700px]:px-8" :class="sheet ? 'max-w-[720px]' : 'mx-auto max-w-[760px]'">
      <header>
        <p class="ep-eyebrow !text-ep-teal">
          {{ [JURISDICTION_TYPE_LABEL[j.type], j.tradition ? TRADITION_LABEL[j.tradition] : '', countryName(j.country)].filter(Boolean).join(' · ') }}
        </p>
        <h1 class="mt-1.5 font-ep-serif text-[34px] font-semibold leading-[1.05] text-ep-ink min-[700px]:text-[44px]">{{ j.acronym ?? j.name }}</h1>
        <p v-if="j.acronym" class="mt-1.5 text-[17px] text-ep-body">{{ j.name }}</p>
        <p v-if="j.aliases.length" class="mt-2 text-xs text-ep-muted">
          Também: <span v-for="(a, i) in j.aliases" :key="a">{{ a }}<template v-if="i < j.aliases.length - 1"> · </template></span>
        </p>
        <div v-if="j.locatorSlug || j.website || j.wikidata" class="mt-4 flex flex-wrap gap-2">
          <NuxtLink v-if="j.locatorSlug" :to="`/igrejas/${j.locatorSlug}`" class="ep-btn ep-btn-secondary ep-btn-sm">Igrejas no Localizador</NuxtLink>
          <a v-if="j.website" :href="j.website" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary ep-btn-sm">Site oficial ↗</a>
          <a v-if="j.wikidata" :href="`https://www.wikidata.org/wiki/${j.wikidata}`" target="_blank" rel="noopener" class="ep-btn ep-btn-secondary ep-btn-sm">Wikidata ↗</a>
        </div>

        <dl class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-x-5 gap-y-3.5 border-y border-ep-line py-4">
          <div v-if="j.founded?.date">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Fundação</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink">{{ formatDate(j.founded.date) }}<EpiscopadoCites :cites="j.founded.cites" /></dd>
          </div>
          <div v-if="j.dissolved?.date">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Extinção</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink">{{ formatDate(j.dissolved.date) }}<EpiscopadoCites :cites="j.dissolved.cites" /></dd>
          </div>
          <div v-if="origin">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">{{ RELATION_LABEL[origin.type] }}</dt>
            <dd class="mt-[3px] text-sm font-medium"><NuxtLink :to="link.jurisdiction(origin.other.id)" class="ep-link">{{ origin.other.acronym ?? origin.other.name }}</NuxtLink><span v-if="origin.date" class="font-normal text-ep-muted"> ({{ formatDate(origin.date) }})</span></dd>
          </div>
          <div v-if="bishops.length">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Bispos e primazes</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink"><button type="button" class="ep-link" @click="scrollTo('bispos')">{{ bishops.length }}</button></dd>
          </div>
          <div v-if="children.length">
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Deu origem a</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink"><button type="button" class="ep-link" @click="scrollTo('origem')">{{ children.length }} {{ children.length === 1 ? 'jurisdição' : 'jurisdições' }}</button></dd>
          </div>
          <div>
            <dt class="text-[11px] uppercase tracking-[.06em] text-ep-faint">Fontes</dt>
            <dd class="mt-[3px] text-sm font-medium text-ep-ink"><button type="button" class="ep-link" @click="scrollTo('fontes')">{{ j.footnotes.length }} {{ j.footnotes.length === 1 ? 'nota' : 'notas' }}</button></dd>
          </div>
        </dl>
      </header>

      <section id="resumo" class="mt-7 scroll-mt-28">
        <h2 class="sr-only">Resumo</h2>
        <p v-if="j.description" class="text-[17px] leading-[1.65] text-ep-ink-2">{{ j.description }}<EpiscopadoCites :cites="j.descriptionCites" /></p>
        <p v-else class="rounded-ep bg-ep-paper px-4 py-3 text-sm text-ep-muted">Ainda não há descrição registrada.</p>
      </section>

      <!-- Origem e relações -->
      <section v-if="j.relations.length || j.inbound.length" id="origem" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title mb-4">Origem e relações</h2>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3.5">
          <div v-for="group in relationGroups" :key="group.title" class="rounded-ep border border-ep-line p-3.5">
            <h3 class="ep-eyebrow mb-2.5">{{ group.title }}</h3>
            <ul class="flex flex-col gap-2.5">
              <li v-for="(r, i) in group.items" :key="i" class="text-sm">
                <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span class="text-ep-muted">{{ r.label }}</span>
                  <NuxtLink :to="link.jurisdiction(r.other.id)" class="ep-link font-medium">{{ r.other.acronym ?? r.other.name }}</NuxtLink>
                  <span v-if="r.date || r.end" class="text-ep-muted">{{ formatPeriod(r.date, r.end).replace(/^desde /, '') }}</span>
                  <EpiscopadoStatus :status="r.status" />
                  <EpiscopadoCites :cites="r.cites" />
                </div>
                <p v-if="r.other.acronym" class="mt-0.5 text-xs text-ep-muted">{{ r.other.name }}</p>
                <p v-if="r.ledBy.length" class="mt-0.5 text-xs text-ep-body">
                  Liderada por
                  <template v-for="(p, k) in r.ledBy" :key="p.id"><NuxtLink :to="link.person(p.id)" class="ep-link">{{ p.name }}</NuxtLink><template v-if="k < r.ledBy.length - 1">, </template></template>
                </p>
                <p v-if="r.notes" class="mt-0.5 text-xs text-ep-muted">{{ r.notes }}</p>
                <EpiscopadoDiscrepancies :items="r.discrepancies" />
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Bispos -->
      <section v-if="bishops.length" id="bispos" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title">Bispos, primazes e fundadores</h2>
        <p class="mb-4 mt-1 text-[13px] text-ep-muted">Uma entrada por pessoa, em ordem de início do vínculo.</p>
        <ol class="relative ml-3 border-l-2 border-ep-line">
          <li v-for="g in bishops" :key="g.person.id" class="relative pb-5 pl-6 last:pb-0">
            <span class="absolute -left-[7px] top-[5px] h-3 w-3 rounded-full ring-4 ring-ep-card" :class="g.current ? 'bg-ep-teal' : 'bg-ep-rule'" aria-hidden="true" />
            <NuxtLink :to="link.person(g.person.id)" class="ep-link text-sm font-semibold">{{ g.person.name }}</NuxtLink>
            <ul class="mt-0.5 space-y-1">
              <li v-for="(l, k) in g.lines" :key="k" class="text-sm">
                <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span class="text-ep-ink-3">{{ rolesLabel(l) }}</span>
                  <NuxtLink v-if="l.diocese" :to="link.jurisdiction(l.diocese.id)" class="text-ep-muted hover:underline">· {{ l.diocese.acronym ?? l.diocese.name }}</NuxtLink>
                  <span class="text-ep-muted">· {{ formatPeriod(l.start, l.end) || 'período não registrado' }}<span v-if="l.endReason"> ({{ END_REASON_LABEL[l.endReason] }})</span></span>
                  <EpiscopadoStatus :status="l.status" :show-confirmed="false" />
                  <EpiscopadoCites :cites="l.cites" />
                </div>
                <EpiscopadoDiscrepancies :items="l.discrepancies" />
              </li>
            </ul>
          </li>
        </ol>
      </section>

      <!-- Clero e membros -->
      <section v-if="clergy.length" id="clero" class="mt-9 scroll-mt-28">
        <h2 class="ep-section-title mb-4">Clero e membros</h2>
        <ul class="overflow-hidden rounded-ep border border-ep-line-2">
          <li v-for="g in clergy" :key="g.person.id" class="border-b border-ep-line-2 bg-ep-card px-3 py-2.5 text-sm last:border-b-0">
            <NuxtLink :to="link.person(g.person.id)" class="ep-link font-medium">{{ g.person.name }}</NuxtLink>
            <ul class="mt-0.5 space-y-0.5">
              <li v-for="(l, k) in g.lines" :key="k" class="flex flex-wrap items-baseline gap-x-2">
                <span class="text-ep-body">{{ rolesLabel(l) }}</span>
                <NuxtLink v-if="l.diocese" :to="link.jurisdiction(l.diocese.id)" class="text-ep-muted hover:underline">· {{ l.diocese.acronym ?? l.diocese.name }}</NuxtLink>
                <span class="text-ep-muted">{{ formatPeriod(l.start, l.end) }}</span>
                <span v-if="l.endReason" class="text-ep-muted">({{ END_REASON_LABEL[l.endReason] }})</span>
                <EpiscopadoStatus :status="l.status" :show-confirmed="false" />
                <EpiscopadoCites :cites="l.cites" />
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <EpiscopadoFootnotes :footnotes="j.footnotes" />
      <EpiscopadoHowToRead />
    </article>
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
} from '../../lib/labels'
import { groupMembers, type JurisdictionView, type MemberRoleLine, type RelationView } from '../../lib/views'
import type { TocItem } from './EpiscopadoToc.vue'

/** Ficha completa de uma jurisdição; usada na página da ficha e na folha sobre o grafo (`sheet`). */
const props = defineProps<{ jurisdiction: JurisdictionView; sheet?: boolean }>()
const emit = defineEmits<{ back: []; close: [] }>()

const j = computed(() => props.jurisdiction)
const link = useEpiscopadoNodeLink()
provideEpiscopadoFootnotes(computed(() => props.jurisdiction.footnotes))

const ORIGIN_TYPES = new Set(['schism_from', 'successor_of', 'part_of', 'merged_with'])

// Uma entrada por pessoa: quem teve algum papel episcopal aparece só entre os bispos, com toda a trajetória.
const memberGroups = computed(() => groupMembers(j.value.members))
const bishops = computed(() => memberGroups.value.filter((g) => g.episcopal))
const clergy = computed(() => memberGroups.value.filter((g) => !g.episcopal))

/** "Fundador e bispo diocesano" a partir dos papéis de uma linha. */
function rolesLabel(line: MemberRoleLine): string {
  const labels = line.roles.map((r) => (r.role === 'other' && r.roleDescription ? r.roleDescription : ROLE_LABEL[r.role]))
  const text = labels.length > 1 ? `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)!.toLowerCase()}` : labels[0]
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** A relação que explica de onde a jurisdição veio (cisma, sucessão...). */
const origin = computed(() => j.value.relations.find((r) => r.type === 'schism_from' || r.type === 'successor_of') ?? null)
const children = computed(() => j.value.inbound.filter((r) => r.type === 'schism_from' || r.type === 'successor_of'))

type Labeled = RelationView & { label: string }
const relationGroups = computed(() => {
  const v = j.value
  const out = v.relations.map((r): Labeled => ({ ...r, label: RELATION_LABEL[r.type] }))
  const inbound = v.inbound.map((r): Labeled => ({ ...r, label: RELATION_INVERSE_LABEL[r.type] }))
  const groups = [
    { title: 'De onde veio', items: out.filter((r) => ORIGIN_TYPES.has(r.type)) },
    { title: 'Deu origem a / inclui', items: inbound.filter((r) => ORIGIN_TYPES.has(r.type)) },
    { title: 'Comunhões e reconhecimento', items: out.filter((r) => !ORIGIN_TYPES.has(r.type)) },
    { title: 'Reconhecida ou acompanhada por', items: inbound.filter((r) => !ORIGIN_TYPES.has(r.type)) }
  ]
  return groups.filter((g) => g.items.length)
})

const toc = computed<TocItem[]>(() => {
  const v = j.value
  return [
    { id: 'resumo', label: 'Resumo' },
    ...(v.relations.length || v.inbound.length ? [{ id: 'origem', label: 'Origem e relações', count: v.relations.length + v.inbound.length }] : []),
    ...(bishops.value.length ? [{ id: 'bispos', label: 'Bispos', count: bishops.value.length }] : []),
    ...(clergy.value.length ? [{ id: 'clero', label: 'Clero e membros', count: clergy.value.length }] : []),
    { id: 'fontes', label: 'Fontes', count: v.footnotes.length }
  ]
})

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
