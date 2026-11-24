import { slugify } from '../utils/slug'
import { useOrdoApi } from './useOrdoApi'
import {
  isSessionError,
  isValidRosaryCategorySelection,
  type CustomRosaryPagination,
  type CustomRosaryPrayer,
  type CustomRosaryShareStatus,
  type RosaryCategory,
  type RosaryCategorySelection
} from '../types/dashboard'

export type ModerationStatus = Exclude<CustomRosaryShareStatus, 'private'>
export type ModerationOrder = 'oldest' | 'newest' | 'title'

const PAGE_SIZE = 20

const normalize = (value: string) => value
  .toLocaleLowerCase('pt-BR')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')

// Category suggestions from the title. The first rule that matches picks the
// category whose name or slug is in its list, if the CMS has one.
const CATEGORY_RULES: Array<{ pattern: RegExp; keys: string[]; reason: string }> = [
  { pattern: /^salmos?\b/, keys: ['salmos', 'psalms'], reason: 'o título começa com “Salmo”' },
  { pattern: /\b(sao|santo|santa|santos|arcanjo|apostolo|martir)\b/, keys: ['santos', 'saints'], reason: 'o título cita um santo' },
  { pattern: /\b(noite|completas|vesperas|lampadario)\b/, keys: ['noite', 'evening'], reason: 'o título fala da noite' },
  { pattern: /\bmanha\b/, keys: ['manha', 'morning'], reason: 'o título fala da manhã' },
  { pattern: /\b(advento|natal|quaresma|pascoa|pentecostes|epifania)\b/, keys: ['estacoes', 'seasons'], reason: 'o título cita um tempo litúrgico' },
  { pattern: /\bcura\b/, keys: ['cura', 'healing'], reason: 'o título fala de cura' },
  { pattern: /\bpaz\b/, keys: ['paz', 'peace'], reason: 'o título fala de paz' },
  { pattern: /\bcriacao\b/, keys: ['criacao', 'creation'], reason: 'o título fala da criação' }
]

export interface CategorySuggestion {
  category: RosaryCategory
  reason: string
}

export const suggestCategory = (title: string, categories: RosaryCategory[]): CategorySuggestion | null => {
  const text = normalize(title.trim())
  for (const rule of CATEGORY_RULES) {
    if (!rule.pattern.test(text)) continue
    const category = categories.find(item => rule.keys.includes(normalize(item.name)) || rule.keys.includes(normalize(item.slug)))
    if (category) return { category, reason: rule.reason }
  }
  return null
}

/** Titles like "Salmo 12" on the current page, so a series can be reviewed in a row. */
export const PSALM_SERIES = /^\s*salmos?\s+\d+/i

const categoryFromRosary = (category: CustomRosaryPrayer['category']): RosaryCategorySelection | null => {
  if (!category?.slug) return null
  if ('mode' in category && category.mode === 'new') {
    return {
      mode: 'new',
      slug: category.slug,
      name: category.name,
      ...(category.description ? { description: category.description } : {}),
      ...(category.icon ? { icon: category.icon } : {})
    }
  }
  return {
    mode: 'existing',
    slug: category.slug,
    ...('documentId' in category && category.documentId ? { documentId: category.documentId } : {})
  }
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível carregar a fila.'

/**
 * The rosary review workbench: one list (with search, order and pages) and the
 * prayer open beside it. Deciding opens the next one in the same list, and the
 * next detail is fetched ahead so walking a long queue does not wait on every
 * click.
 */
export const useRosaryModeration = () => {
  const { fetchCustomRosaries, fetchCustomRosary, fetchRosaryCategories, approveCustomRosary, rejectCustomRosary } = useOrdoApi()

  const items = ref<CustomRosaryPrayer[]>([])
  const pagination = ref<CustomRosaryPagination | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const status = ref<ModerationStatus>('pending_review')
  const search = ref('')
  const order = ref<ModerationOrder>('oldest')
  const offset = ref(0)

  const selectedId = ref<string | null>(null)
  const detail = ref<CustomRosaryPrayer | null>(null)
  const detailLoading = ref(false)
  const actionLoading = ref(false)
  const actionError = ref<string | null>(null)
  const notice = ref<{ text: string; tone: 'ok' | 'danger' } | null>(null)
  const session = reactive({ approved: 0, rejected: 0 })

  const categories = ref<RosaryCategory[]>([])
  const categoriesLoading = ref(false)
  const categoriesError = ref<string | null>(null)
  const categorySelection = ref<RosaryCategorySelection | null>(null)
  const categoryTouched = ref(false)
  const slug = ref('')
  const slugTouched = ref(false)
  const rejectionReason = ref('')

  const detailCache = new Map<string, CustomRosaryPrayer>()
  let listRequest = 0
  let detailRequest = 0

  const total = computed(() => pagination.value?.total ?? items.value.length)
  const page = computed(() => Math.floor(offset.value / PAGE_SIZE) + 1)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
  const selectedIndex = computed(() => items.value.findIndex(item => String(item.id) === selectedId.value))
  const selected = computed(() => {
    if (!selectedId.value) return null
    if (detail.value && String(detail.value.id) === selectedId.value) return detail.value
    return items.value.find(item => String(item.id) === selectedId.value) || null
  })
  const position = computed(() => selectedIndex.value < 0 ? null : offset.value + selectedIndex.value + 1)
  const seriesOnPage = computed(() => items.value.filter(item => PSALM_SERIES.test(item.title)).length)
  const suggestion = computed(() => selected.value ? suggestCategory(selected.value.title, categories.value) : null)
  const canApprove = computed(() => Boolean(selected.value)
    && status.value === 'pending_review'
    && isValidRosaryCategorySelection(categorySelection.value)
    && Boolean(slug.value.trim()))

  const sortParams = computed(() => order.value === 'title'
    ? { sort: 'title' as const, direction: 'asc' as const }
    : { sort: 'created_at' as const, direction: order.value === 'oldest' ? 'asc' as const : 'desc' as const })

  const resetDecisionFields = (rosary: CustomRosaryPrayer | null) => {
    categoryTouched.value = false
    slugTouched.value = false
    rejectionReason.value = rosary?.moderation_note || ''
    categorySelection.value = rosary ? categoryFromRosary(rosary.category) : null
    slug.value = rosary?.strapi_slug || (rosary ? slugify(rosary.title) : '')
    applySuggestion()
  }

  const applySuggestion = () => {
    if (categoryTouched.value || categorySelection.value || !suggestion.value) return
    const { category } = suggestion.value
    categorySelection.value = { mode: 'existing', slug: category.slug, ...(category.documentId ? { documentId: category.documentId } : {}) }
  }

  const loadCategories = async () => {
    if (categories.value.length || categoriesLoading.value) return
    categoriesLoading.value = true
    categoriesError.value = null
    try {
      const response = await fetchRosaryCategories()
      categories.value = response.rosary_categories || []
      applySuggestion()
    } catch (caught) {
      if (!isSessionError(caught)) categoriesError.value = errorMessage(caught)
    } finally {
      categoriesLoading.value = false
    }
  }

  const fetchDetail = async (rosary: CustomRosaryPrayer) => {
    const key = String(rosary.id)
    const cached = detailCache.get(key)
    if (cached) return cached
    const response = await fetchCustomRosary(rosary.id)
    detailCache.set(key, response.custom_rosary_prayer)
    return response.custom_rosary_prayer
  }

  const prefetchNext = () => {
    const next = items.value[selectedIndex.value + 1]
    if (next && !detailCache.has(String(next.id))) fetchDetail(next).catch(() => {})
  }

  const select = async (rosary: CustomRosaryPrayer | null | undefined) => {
    actionError.value = null
    if (!rosary) {
      selectedId.value = null
      detail.value = null
      resetDecisionFields(null)
      return
    }
    const requestId = ++detailRequest
    selectedId.value = String(rosary.id)
    const cached = detailCache.get(String(rosary.id))
    detail.value = cached || null
    resetDecisionFields(cached || rosary)
    if (cached) {
      prefetchNext()
      return
    }
    detailLoading.value = true
    try {
      const full = await fetchDetail(rosary)
      if (requestId !== detailRequest) return
      detail.value = full
      if (!categoryTouched.value && !slugTouched.value) resetDecisionFields(full)
      prefetchNext()
    } catch (caught) {
      if (requestId === detailRequest && !isSessionError(caught)) actionError.value = errorMessage(caught)
    } finally {
      if (requestId === detailRequest) detailLoading.value = false
    }
  }

  const load = async ({ keepSelection = false } = {}) => {
    const requestId = ++listRequest
    loading.value = true
    error.value = null
    try {
      const response = await fetchCustomRosaries({
        share_status: status.value,
        search: search.value,
        ...sortParams.value,
        limit: PAGE_SIZE,
        offset: offset.value
      })
      if (requestId !== listRequest) return
      items.value = response.custom_rosary_prayers || []
      pagination.value = response.pagination || null
      if (!items.value.length && offset.value > 0) {
        offset.value = Math.max(0, offset.value - PAGE_SIZE)
        await load({ keepSelection })
        return
      }
      const stillThere = keepSelection && items.value.some(item => String(item.id) === selectedId.value)
      if (!stillThere) await select(items.value[0])
    } catch (caught) {
      if (requestId === listRequest && !isSessionError(caught)) error.value = errorMessage(caught)
    } finally {
      if (requestId === listRequest) loading.value = false
    }
  }

  const setStatus = async (value: ModerationStatus) => {
    status.value = value
    offset.value = 0
    notice.value = null
    await load()
  }

  const setOrder = async (value: ModerationOrder) => {
    order.value = value
    offset.value = 0
    await load()
  }

  let searchTimer: ReturnType<typeof setTimeout> | null = null
  const setSearch = (value: string, { immediate = false } = {}) => {
    search.value = value
    if (searchTimer) clearTimeout(searchTimer)
    const run = () => {
      offset.value = 0
      load()
    }
    if (immediate) run()
    else searchTimer = setTimeout(run, 350)
  }

  const goToPage = async (direction: number) => {
    const next = offset.value + direction * PAGE_SIZE
    if (next < 0 || next >= totalPages.value * PAGE_SIZE) return
    offset.value = next
    await load()
  }

  const step = async (direction: number) => {
    const index = selectedIndex.value + direction
    if (index >= 0 && index < items.value.length) {
      notice.value = null
      await select(items.value[index])
      return
    }
    if (direction > 0 && page.value < totalPages.value) await goToPage(1)
    else if (direction < 0 && page.value > 1) {
      await goToPage(-1)
      await select(items.value[items.value.length - 1])
    }
  }

  // A decided prayer leaves the "em revisão" list; the one that takes its
  // place is the next to read. The page refills in the background.
  const afterDecision = async (updated: CustomRosaryPrayer, verb: 'aprovado' | 'rejeitado') => {
    detailCache.delete(String(updated.id))
    const index = selectedIndex.value
    const leaves = updated.share_status !== status.value
    if (leaves) {
      items.value = items.value.filter(item => String(item.id) !== String(updated.id))
      if (pagination.value) pagination.value = { ...pagination.value, total: Math.max(0, pagination.value.total - 1) }
    } else {
      items.value = items.value.map(item => String(item.id) === String(updated.id) ? updated : item)
    }
    const nextIndex = leaves ? index : index + 1
    const next = items.value[nextIndex]
    notice.value = {
      text: `“${updated.title}” ${verb}. ${next ? 'Abrindo o próximo.' : 'Não há mais nada nesta página.'}`,
      tone: verb === 'aprovado' ? 'ok' : 'danger'
    }
    if (next) await select(next)
    else if (page.value < totalPages.value || items.value.length === 0) await load()
    else await select(null)
    if (leaves && items.value.length < PAGE_SIZE && total.value > items.value.length + offset.value) load({ keepSelection: true })
  }

  const approve = async () => {
    const current = selected.value
    if (!current || !canApprove.value || actionLoading.value || !categorySelection.value) return
    actionLoading.value = true
    actionError.value = null
    try {
      const response = await approveCustomRosary(current.id, categorySelection.value, slug.value)
      session.approved += 1
      await afterDecision(response.custom_rosary_prayer, 'aprovado')
    } catch (caught) {
      if (!isSessionError(caught)) actionError.value = errorMessage(caught)
    } finally {
      actionLoading.value = false
    }
  }

  const reject = async () => {
    const current = selected.value
    if (!current || actionLoading.value) return
    actionLoading.value = true
    actionError.value = null
    try {
      const response = await rejectCustomRosary(current.id, rejectionReason.value)
      session.rejected += 1
      await afterDecision(response.custom_rosary_prayer, 'rejeitado')
    } catch (caught) {
      if (!isSessionError(caught)) actionError.value = errorMessage(caught)
    } finally {
      actionLoading.value = false
    }
  }

  const chooseCategory = (selection: RosaryCategorySelection | null) => {
    categoryTouched.value = true
    categorySelection.value = selection
  }

  const editSlug = (value: string) => {
    slugTouched.value = true
    slug.value = value
  }

  watch(suggestion, applySuggestion)

  return {
    PAGE_SIZE,
    items,
    pagination,
    loading,
    error,
    status,
    search,
    order,
    offset,
    total,
    page,
    totalPages,
    selected,
    selectedId,
    selectedIndex,
    position,
    detailLoading,
    actionLoading,
    actionError,
    notice,
    session,
    categories,
    categoriesLoading,
    categoriesError,
    categorySelection,
    suggestion,
    slug,
    rejectionReason,
    seriesOnPage,
    canApprove,
    load,
    loadCategories,
    select,
    step,
    setStatus,
    setOrder,
    setSearch,
    goToPage,
    approve,
    reject,
    chooseCategory,
    editSlug
  }
}

export type RosaryModeration = ReturnType<typeof useRosaryModeration>
