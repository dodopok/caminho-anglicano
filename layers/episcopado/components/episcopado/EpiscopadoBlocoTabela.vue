<template>
  <div>
    <div class="overflow-x-auto rounded-ep border border-ep-line">
      <table class="w-full border-collapse text-left text-[13px]">
        <thead class="bg-ep-paper-2">
          <tr>
            <th v-for="c in visible" :key="c.i" scope="col" class="whitespace-nowrap border-b border-ep-line px-3 py-2 font-ep-mono text-[11px] font-medium uppercase tracking-[.05em] text-ep-muted">{{ columnLabel(c.name) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, r) in shownRows" :key="r" class="border-b border-ep-line-2 last:border-b-0 hover:bg-ep-paper-2">
            <td v-for="c in visible" :key="c.i" class="px-3 py-1.5 align-top text-ep-ink-3" :class="typeof row[c.i] === 'number' ? 'tabular-nums' : ''">
              <EpiscopadoStatus v-if="c.name === 'status' && isStatus(row[c.i])" :status="row[c.i] as 'confirmed'" />
              <NuxtLink v-else-if="c.linkFrom !== undefined && nodeOf(c.linkCol!, row[c.linkFrom])" :to="nodeRoute(nodeOf(c.linkCol!, row[c.linkFrom])!.id)" class="ep-link">{{ row[c.i] }}</NuxtLink>
              <NuxtLink v-else-if="nodeOf(c.name, row[c.i])" :to="nodeRoute(nodeOf(c.name, row[c.i])!.id)" class="ep-link">{{ nodeOf(c.name, row[c.i])!.label }}</NuxtLink>
              <template v-else-if="row[c.i] === null || row[c.i] === ''"><span class="text-ep-faint">—</span></template>
              <template v-else>{{ displayValue(c.name, row[c.i]) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ep-muted">
      <span>{{ bloco.linhas.length }} {{ bloco.linhas.length === 1 ? 'linha' : 'linhas' }}<template v-if="bloco.truncado"> (de {{ bloco.total > 500 ? 'mais de 500' : bloco.total }})</template></span>
      <button v-if="bloco.linhas.length > PAGE && !all" type="button" class="font-medium text-ep-garnet-ink hover:underline" @click="all = true">Mostrar todas</button>
      <button type="button" class="font-medium text-ep-garnet-ink hover:underline" @click="downloadCsv">Baixar CSV</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GraphNode } from '../../lib/graph'
import type { Bloco } from '../../lib/pergunta/blocos'
import { columnLabel, displayValue } from '../../lib/pergunta/tabela'
import { nodeRoute } from '../../lib/style'

/** Bloco de tabela do Pergunte à Rede: ids viram links para as fichas; `claim_id` só vai no CSV. */
const props = defineProps<{ bloco: Extract<Bloco, { tipo: 'tabela' }> }>()

const PAGE = 25
const all = ref(false)
const PERSON_COLS = /^(person|pessoa|principal_consecrator|ordained_by|consecrator|ordainer|sagrante|ordenante|leader|lider|bishop|bispo|co_consecrator)$/
const JURISDICTION_COLS = /^(jurisdiction|jurisdicao|diocese|source_jurisdiction|target|ancestor|igreja|church|origem|alvo|onde)$/
const HIDDEN = new Set(['claim_id'])

const { data: graph } = useEpiscopadoGraph()
const nodes = computed(() => new Map((graph.value?.nodes ?? []).map((n) => [n.id, n])))

interface Col { name: string; i: number; linkFrom?: number; linkCol?: string }

/**
 * Colunas exibidas: some `claim_id`; quando há uma coluna de nome e outra de id da mesma pessoa
 * ("name" + "person"), o nome vira o link e a coluna de id some.
 */
const visible = computed<Col[]>(() => {
  const cols: Col[] = props.bloco.colunas.map((name, i) => ({ name, i }))
  const hide = new Set(HIDDEN)
  const nameCol = cols.find((c) => /^(name|nome)$/.test(c.name))
  const first = props.bloco.linhas[0]
  if (nameCol && first) {
    const idCol = cols.find((c) => c !== nameCol && nodeOf(c.name, first[c.i])?.label === first[nameCol.i])
    if (idCol) {
      nameCol.linkFrom = idCol.i
      nameCol.linkCol = idCol.name
      hide.add(idCol.name)
    }
  }
  return cols.filter((c) => !hide.has(c.name))
})
const shownRows = computed(() => (all.value ? props.bloco.linhas : props.bloco.linhas.slice(0, PAGE)))

const isStatus = (v: unknown) => v === 'confirmed' || v === 'probable' || v === 'contested'

function nodeOf(col: string, v: unknown): GraphNode | null {
  if (typeof v !== 'string' || !v) return null
  if (/^[pj]:[a-z0-9-]+$/.test(v)) return nodes.value.get(v) ?? null
  if (PERSON_COLS.test(col)) return nodes.value.get(`p:${v}`) ?? null
  if (JURISDICTION_COLS.test(col)) return nodes.value.get(`j:${v}`) ?? null
  return null
}

function downloadCsv() {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [props.bloco.colunas.map(esc).join(','), ...props.bloco.linhas.map((r) => r.map(esc).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${(props.bloco.titulo || 'pergunte-a-rede').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
