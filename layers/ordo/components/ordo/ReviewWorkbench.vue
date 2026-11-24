<script setup lang="ts">
import OrdoIcon from './Icon.vue'
import type { ModerationOrder, ModerationStatus, RosaryModeration } from '../../composables/useRosaryModeration'
import type { CustomRosaryPrayer, CustomRosaryStep, RosaryCategory } from '../../types/dashboard'

const props = defineProps<{ moderation: RosaryModeration }>()
const m = props.moderation

const STATUSES: Array<{ value: ModerationStatus; label: string }> = [
  { value: 'pending_review', label: 'Em revisão' },
  { value: 'approved', label: 'Aprovados' },
  { value: 'rejected', label: 'Rejeitados' }
]
const ORDERS: Array<{ value: ModerationOrder; label: string }> = [
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'newest', label: 'Mais novos' },
  { value: 'title', label: 'A–Z' }
]

const rejecting = ref(false)
const newCategoryMode = ref(false)
const newCategory = reactive({ name: '', slug: '', description: '' })
const searchText = ref(m.search.value)
const reviewScroll = ref<HTMLElement | null>(null)

const now = Date.now()
const age = (value?: string) => {
  if (!value) return ''
  const diff = Math.max(0, now - new Date(value).getTime())
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'agora'
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}
const ageDays = (value?: string) => value ? Math.floor((now - new Date(value).getTime()) / 86_400_000) : 0
const longDate = (value?: string) => value
  ? new Date(value).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const pillFor = (rosary: CustomRosaryPrayer | null) => {
  if (rosary?.share_status === 'approved') return { text: 'Aprovado', tone: 'ok' }
  if (rosary?.share_status === 'rejected') return { text: 'Rejeitado', tone: 'danger' }
  return { text: 'Em revisão', tone: 'gold' }
}

const rangeText = computed(() => {
  if (!m.total.value) return 'Fila vazia'
  const start = m.offset.value + 1
  const end = m.offset.value + m.items.value.length
  return `${start}–${end} de ${m.total.value.toLocaleString('pt-BR')}`
})

const selected = computed(() => m.selected.value)
const steps = computed<CustomRosaryStep[]>(() => selected.value?.expanded_steps || [])

interface StepGroup { key: string; label: string; count: number; texts: Array<{ text: string; n: number }> }
const groups = computed<StepGroup[]>(() => {
  const out: StepGroup[] = []
  steps.value.forEach((step, index) => {
    const label = step.display_title || step.title || 'Conta'
    const text = (step.text || '').trim()
    const last = out[out.length - 1]
    if (last && last.label === label) {
      last.count += 1
      const lastText = last.texts[last.texts.length - 1]
      if (lastText && lastText.text === text) lastText.n += 1
      else last.texts.push({ text, n: 1 })
    } else {
      out.push({ key: `${index}-${label}`, label, count: 1, texts: [{ text, n: 1 }] })
    }
  })
  return out
})

const beads = computed(() => {
  const list: boolean[] = []
  groups.value.forEach(group => {
    for (let index = 0; index < group.count; index += 1) list.push(index === 0)
  })
  return list.slice(0, 160)
})

interface Check { key: string; tone: 'ok' | 'warn' | 'info'; title: string; detail?: string }
const checks = computed<Check[]>(() => {
  const rosary = selected.value
  if (!rosary) return []
  const list: Check[] = []
  const blocks = rosary.blocks?.length || 0
  const total = rosary.expanded_steps_count ?? steps.value.length
  const laps = rosary.cycle_repeat && rosary.cycle_repeat > 1 ? `, ${rosary.cycle_repeat} voltas` : ''
  list.push({ key: 'structure', tone: total ? 'ok' : 'warn', title: total ? `${total} contas` : 'Sem contas', detail: blocks ? `em ${blocks} ${blocks === 1 ? 'bloco' : 'blocos'}${laps}.` : undefined })
  const empty = steps.value.filter(step => !(step.text || '').trim()).length
  list.push(empty
    ? { key: 'empty', tone: 'warn', title: `${empty} ${empty === 1 ? 'conta sem texto' : 'contas sem texto'}.` }
    : { key: 'empty', tone: 'ok', title: 'Nenhuma conta vazia.' })
  const similar = rosary.similar_titles || []
  if (similar.length) {
    const sourceLabel = (source: string) => source === 'catalog' ? 'publicado' : source === 'queue' ? 'também na fila' : 'da comunidade'
    list.push({
      key: 'similar',
      tone: 'warn',
      title: 'Título parecido com:',
      detail: similar.map(item => `“${item.title}” (${sourceLabel(item.source)})`).join(', ') + '. Confira se não é a mesma oração.'
    })
  } else if (rosary.similar_titles) {
    list.push({ key: 'similar', tone: 'ok', title: 'Nenhum título parecido no catálogo.' })
  }
  if (rosary.moderation_reentry_count) {
    list.push({ key: 'reentry', tone: 'info', title: `Reenviado ${rosary.moderation_reentry_count === 1 ? 'uma vez' : `${rosary.moderation_reentry_count} vezes`} depois de rejeitado.`, detail: rosary.moderation_note ? `Última nota: “${rosary.moderation_note}”` : undefined })
  }
  if (m.suggestion.value) list.push({ key: 'category', tone: 'info', title: `Categoria sugerida: ${m.suggestion.value.category.name}.`, detail: `Porque ${m.suggestion.value.reason}.` })
  return list
})

const authorLine = computed(() => {
  const author = selected.value?.author
  if (!author) return ''
  const parts: string[] = []
  if (author.submissions_count != null) parts.push(`${author.submissions_count} ${author.submissions_count === 1 ? 'enviado' : 'enviados'}`)
  if (author.approved_count) parts.push(`${author.approved_count} ${author.approved_count === 1 ? 'aprovado' : 'aprovados'}`)
  if (author.rejected_count) parts.push(`${author.rejected_count} ${author.rejected_count === 1 ? 'rejeitado' : 'rejeitados'}`)
  if (author.pending_count && author.pending_count > 1) parts.push(`${author.pending_count} na fila`)
  return parts.join(' · ')
})
const authorInitials = computed(() => (selected.value?.author?.name || '?').split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join(''))

const categoryKey = (category: RosaryCategory) => category.documentId || category.slug
const sortedCategories = computed(() => [...m.categories.value].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
const selectedCategoryKey = computed(() => {
  const selection = m.categorySelection.value
  if (!selection || selection.mode !== 'existing') return ''
  const match = m.categories.value.find(category => category.slug === selection.slug || (selection.documentId && category.documentId === selection.documentId))
  return match ? categoryKey(match) : ''
})
const selectedCategory = computed(() => m.categories.value.find(category => categoryKey(category) === selectedCategoryKey.value))
const categoryNote = computed(() => {
  if (newCategoryMode.value) return 'Nome e endereço são obrigatórios para criar.'
  if (!selectedCategory.value) return 'Escolha uma categoria para poder aprovar.'
  const suggested = m.suggestion.value && categoryKey(m.suggestion.value.category) === selectedCategoryKey.value
  return suggested
    ? `Sugerida porque ${m.suggestion.value?.reason}. ${selectedCategory.value.description || ''}`
    : selectedCategory.value.description || ''
})

const onCategoryChange = (event: Event) => {
  const key = (event.target as HTMLSelectElement).value
  const category = m.categories.value.find(item => categoryKey(item) === key)
  m.chooseCategory(category ? { mode: 'existing', slug: category.slug, ...(category.documentId ? { documentId: category.documentId } : {}) } : null)
}

const syncNewCategory = () => m.chooseCategory({ mode: 'new', name: newCategory.name.trim(), slug: newCategory.slug.trim(), ...(newCategory.description.trim() ? { description: newCategory.description.trim() } : {}) })
const toggleNewCategory = () => {
  newCategoryMode.value = !newCategoryMode.value
  if (newCategoryMode.value) syncNewCategory()
  else m.chooseCategory(null)
}

const onSearchInput = (event: Event) => {
  searchText.value = (event.target as HTMLInputElement).value
  m.setSearch(searchText.value)
}
const filterSeries = () => {
  searchText.value = 'Salmo'
  m.setSearch('Salmo', { immediate: true })
}
const clearSearch = () => {
  searchText.value = ''
  m.setSearch('', { immediate: true })
}

const approve = async () => {
  rejecting.value = false
  await m.approve()
}
const confirmReject = async () => {
  await m.reject()
  rejecting.value = false
}

watch(() => m.selectedId.value, () => {
  rejecting.value = false
  newCategoryMode.value = false
  Object.assign(newCategory, { name: '', slug: '', description: '' })
  reviewScroll.value?.scrollTo({ top: 0 })
})

const onKeydown = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || event.metaKey || event.ctrlKey || event.altKey) return
  if (event.key === 'ArrowDown' || event.key === 'j') {
    event.preventDefault()
    m.step(1)
  } else if (event.key === 'ArrowUp' || event.key === 'k') {
    event.preventDefault()
    m.step(-1)
  } else if (event.key === 'a' && m.canApprove.value) {
    event.preventDefault()
    approve()
  } else if (event.key === 'r' && m.status.value === 'pending_review' && selected.value) {
    event.preventDefault()
    rejecting.value = true
  }
}
</script>

<template>
  <section class="op-bench" aria-label="Bancada de revisão de rosários" @keydown="onKeydown">
    <div class="op-bench__queue">
      <label class="op-search">
        <span class="op-sr-only">Buscar na fila</span>
        <OrdoIcon name="search" :size="18" />
        <input class="op-field" type="search" placeholder="Buscar título ou autor" :value="searchText" @input="onSearchInput" @keydown.enter="m.setSearch(searchText, { immediate: true })">
      </label>
      <div class="op-seg op-seg--small" role="group" aria-label="Situação">
        <button v-for="option in STATUSES" :key="option.value" type="button" :class="{ 'is-on': m.status.value === option.value }" :aria-pressed="m.status.value === option.value" @click="m.setStatus(option.value)">{{ option.label }}</button>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap">
        <span class="op-faint" style="font-size: 12.5px; font-weight: 600">Ordenar</span>
        <div class="op-seg op-seg--small" role="group" aria-label="Ordem da fila">
          <button v-for="option in ORDERS" :key="option.value" type="button" :class="{ 'is-on': m.order.value === option.value }" :aria-pressed="m.order.value === option.value" @click="m.setOrder(option.value)">{{ option.label }}</button>
        </div>
      </div>
      <button v-if="m.seriesOnPage.value > 1 && !m.search.value" type="button" class="op-chip" style="justify-content: space-between" @click="filterSeries">
        <span>Série de Salmos</span><span class="op-count op-count--quiet">{{ m.seriesOnPage.value }} nesta página</span>
      </button>
      <button v-else-if="m.search.value" type="button" class="op-chip is-on" style="justify-content: space-between" @click="clearSearch">
        <span>Buscando “{{ m.search.value }}”</span><OrdoIcon name="close" :size="16" />
      </button>

      <p v-if="m.error.value" class="op-inline-error">{{ m.error.value }}</p>
      <ul class="op-bench__list" :aria-busy="m.loading.value">
        <template v-if="m.loading.value && !m.items.value.length">
          <li v-for="n in 6" :key="`sk-${n}`" style="padding: 6px"><span class="op-skeleton" style="height: 52px" /></li>
        </template>
        <li v-for="item in m.items.value" :key="item.id">
          <button
            type="button"
            class="op-qitem"
            :class="{ 'is-sel': String(item.id) === m.selectedId.value, 'is-done': item.share_status && item.share_status !== m.status.value }"
            :aria-current="String(item.id) === m.selectedId.value ? 'true' : undefined"
            @click="m.select(item)"
          >
            <span class="op-qitem__copy">
              <span class="op-qitem__title">{{ item.title }}</span>
              <span class="op-qitem__meta">
                <span>{{ item.author?.name || 'Autor sem nome' }}</span>
                <span v-if="item.expanded_steps_count">· {{ item.expanded_steps_count }} contas</span>
                <span v-if="item.similar_titles?.length" class="op-pill op-pill--warn" style="padding: 0 7px; font-size: 11px">parecido</span>
                <span v-if="item.moderation_reentry_count" class="op-pill op-pill--info" style="padding: 0 7px; font-size: 11px">reenvio</span>
              </span>
            </span>
            <span class="op-qitem__age" :style="{ color: ageDays(item.created_at) > 30 ? 'var(--op-gold-ink)' : 'var(--op-ink-faint)' }">{{ age(item.created_at) }}</span>
          </button>
        </li>
        <li v-if="!m.loading.value && !m.items.value.length && !m.error.value" class="op-empty" style="padding: 18px 8px">
          {{ m.status.value === 'pending_review' ? 'Nenhum rosário esperando revisão. Fila em dia.' : 'Nada nesta lista.' }}
        </li>
      </ul>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px">
        <button type="button" class="op-icon-btn" aria-label="Página anterior" :disabled="m.page.value <= 1 || m.loading.value" @click="m.goToPage(-1)"><OrdoIcon name="chevron-left" :size="16" /></button>
        <span class="op-faint" style="font-size: 12.5px">{{ rangeText }}</span>
        <button type="button" class="op-icon-btn" aria-label="Próxima página" :disabled="m.page.value >= m.totalPages.value || m.loading.value" @click="m.goToPage(1)"><OrdoIcon name="chevron-right" :size="16" /></button>
      </div>
    </div>

    <article class="op-bench__review" aria-labelledby="review-title">
      <div v-if="m.notice.value" class="op-review__notice" :class="m.notice.value.tone === 'ok' ? 'op-tone-ok' : 'op-tone-danger'" role="status">
        <OrdoIcon :name="m.notice.value.tone === 'ok' ? 'check' : 'close'" :size="18" />
        <span>{{ m.notice.value.text }}</span>
      </div>
      <template v-if="selected">
        <header class="op-review__head">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">
            <span style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <span class="op-eyebrow">{{ m.position.value ?? '–' }} de {{ m.total.value.toLocaleString('pt-BR') }}</span>
              <span class="op-pill" :class="`op-pill--${pillFor(selected).tone}`">{{ pillFor(selected).text }}</span>
            </span>
            <span style="display: flex; gap: 6px">
              <button type="button" class="op-icon-btn" aria-label="Anterior (seta para cima)" @click="m.step(-1)"><OrdoIcon name="chevron-up" :size="16" /></button>
              <button type="button" class="op-icon-btn" aria-label="Próximo (seta para baixo)" @click="m.step(1)"><OrdoIcon name="chevron-down" :size="16" /></button>
            </span>
          </div>
          <h2 id="review-title">{{ selected.title }}</h2>
          <p v-if="selected.description" class="op-review__desc">{{ selected.description }}</p>
          <div class="op-author">
            <span class="op-initials" aria-hidden="true">{{ authorInitials }}</span>
            <span class="op-author__copy">
              <strong>{{ selected.author?.name || 'Autor sem nome' }}</strong>
              <span>{{ [selected.author?.email, authorLine].filter(Boolean).join(' · ') || 'Sem histórico de envios' }}</span>
            </span>
          </div>
          <span class="op-faint" style="font-size: 13px">Enviado em {{ longDate(selected.created_at) }} · espera há {{ age(selected.created_at) }} · {{ selected.locale || 'idioma não informado' }}</span>
        </header>
        <div ref="reviewScroll" class="op-bench__scroll">
          <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px 22px 24px">
            <section class="op-checks" aria-label="Checagem automática">
              <span class="op-eyebrow">Checagem automática</span>
              <ul>
                <li v-for="check in checks" :key="check.key">
                  <i :class="check.tone === 'ok' ? 'op-tone-ok' : check.tone === 'warn' ? 'op-tone-warn' : 'op-tone-info'" aria-hidden="true">
                    <OrdoIcon :name="check.tone === 'ok' ? 'check' : check.tone === 'warn' ? 'alert' : 'info'" :size="12" :stroke-width="3" />
                  </i>
                  <span><strong>{{ check.title }}</strong> <span class="op-muted">{{ check.detail }}</span></span>
                </li>
              </ul>
              <div v-if="beads.length" class="op-beads" aria-hidden="true">
                <span v-for="(major, index) in beads" :key="index" :class="{ 'is-major': major }" />
              </div>
            </section>
            <p v-if="m.detailLoading.value && !steps.length" class="op-faint">Carregando as contas…</p>
            <ol v-else-if="groups.length" class="op-steps">
              <li v-for="group in groups" :key="group.key">
                <div class="op-steps__label">
                  <strong>{{ group.label }}</strong>
                  <span>{{ group.count > 1 ? (group.texts.length === 1 ? `${group.count} contas, mesmo texto` : `${group.count} contas`) : '1 conta' }}</span>
                </div>
                <div class="op-steps__texts">
                  <p v-for="(text, index) in group.texts" :key="index">{{ text.text || '(sem texto)' }}<em v-if="text.n > 1">× {{ text.n }}</em></p>
                </div>
              </li>
            </ol>
            <p v-else class="op-faint">Este rosário não tem contas.</p>
          </div>
        </div>
      </template>
      <div v-else-if="m.loading.value" style="padding: 24px"><span class="op-skeleton" style="height: 220px" /></div>
      <div v-else class="op-state" style="margin: 22px; border: 0; background: var(--op-paper)">
        <h2>Nada para revisar aqui</h2>
        <p>Quando alguém pedir para compartilhar um rosário, ele aparece nesta fila.</p>
      </div>
    </article>

    <aside class="op-bench__decide" aria-label="Decisão">
      <div style="display: flex; flex-direction: column; gap: 4px">
        <h3 class="op-display" style="margin: 0; font-size: 20px; font-weight: 600">Publicar no app</h3>
        <p class="op-muted" style="margin: 0; font-size: 13px">Categoria e endereço são obrigatórios.</p>
      </div>
      <template v-if="!newCategoryMode">
        <label class="op-label">
          Categoria
          <select class="op-field" :value="selectedCategoryKey" :disabled="m.categoriesLoading.value || !selected" @change="onCategoryChange">
            <option value="">{{ m.categoriesLoading.value ? 'Carregando categorias…' : 'Escolha uma categoria…' }}</option>
            <option v-for="category in sortedCategories" :key="categoryKey(category)" :value="categoryKey(category)">
              {{ category.name }}{{ m.suggestion.value && categoryKey(m.suggestion.value.category) === categoryKey(category) ? ' (sugerida)' : '' }}
            </option>
          </select>
          <small :style="{ color: selectedCategory ? undefined : 'var(--op-warn)' }">{{ categoryNote }}</small>
        </label>
      </template>
      <template v-else>
        <label class="op-label">Nome da categoria<input v-model="newCategory.name" class="op-field" type="text" placeholder="Ex.: Oração do coração" @input="syncNewCategory"></label>
        <label class="op-label">Endereço da categoria<input v-model="newCategory.slug" class="op-field op-field--mono" type="text" placeholder="oracao-do-coracao" @input="syncNewCategory"></label>
        <label class="op-label">Descrição<input v-model="newCategory.description" class="op-field" type="text" placeholder="Uma linha que aparece no app" @input="syncNewCategory"></label>
      </template>
      <button type="button" class="op-link" style="align-self: flex-start" @click="toggleNewCategory">{{ newCategoryMode ? 'Usar uma categoria existente' : 'Criar uma categoria nova' }}</button>
      <p v-if="m.categoriesError.value" class="op-inline-error" style="font-size: 12.5px">Não foi possível carregar as categorias. {{ m.categoriesError.value }}</p>

      <label class="op-label">
        Endereço no CMS
        <input class="op-field op-field--mono" type="text" :value="m.slug.value" :disabled="!selected" @input="m.editSlug(($event.target as HTMLInputElement).value)">
        <small>Gerado do título. Se você mudar, fica como escreveu.</small>
      </label>

      <p v-if="m.actionError.value" class="op-inline-error" style="font-size: 13px">{{ m.actionError.value }}</p>

      <div style="display: flex; flex-direction: column; gap: 8px">
        <button type="button" class="op-btn op-btn--primary op-btn--block" :disabled="!m.canApprove.value || m.actionLoading.value" @click="approve">
          {{ m.actionLoading.value ? 'Salvando…' : 'Aprovar e ir ao próximo' }}
          <span class="op-kbd" aria-hidden="true">A</span>
        </button>
        <template v-if="m.status.value === 'pending_review' && selected">
          <button v-if="!rejecting" type="button" class="op-btn op-btn--danger op-btn--block" :disabled="m.actionLoading.value" @click="rejecting = true">
            Rejeitar… <span class="op-kbd" aria-hidden="true">R</span>
          </button>
          <div v-else style="display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 14px; background: var(--op-danger-wash)">
            <label class="op-label" style="color: var(--op-danger-ink)">
              Motivo da rejeição
              <textarea v-model="m.rejectionReason.value" class="op-field" rows="3" placeholder="Opcional. Fica registrado na revisão." />
            </label>
            <div style="display: flex; gap: 8px">
              <button type="button" class="op-btn" style="flex: 1" @click="rejecting = false">Voltar</button>
              <button type="button" class="op-btn op-btn--danger-solid" style="flex: 1" :disabled="m.actionLoading.value" @click="confirmReject">Rejeitar</button>
            </div>
          </div>
        </template>
        <button type="button" class="op-btn op-btn--ghost op-btn--block" :disabled="!selected" @click="m.step(1)">Deixar para depois</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px solid var(--op-hair-soft); font-size: 12.5px" class="op-muted">
        <span style="display: flex; align-items: center; gap: 6px"><span class="op-kbd">↑</span><span class="op-kbd">↓</span> anterior e próximo</span>
        <span style="display: flex; align-items: center; gap: 6px"><span class="op-kbd">A</span> aprova · <span class="op-kbd">R</span> rejeita</span>
      </div>
      <p class="op-faint" style="margin: 0; font-size: 12.5px">Nesta sessão: <strong>{{ m.session.approved }}</strong> aprovados, <strong>{{ m.session.rejected }}</strong> rejeitados.</p>
    </aside>
  </section>
</template>
