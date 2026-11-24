import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { CustomRosaryPrayer, RosaryCategory } from '../types/dashboard'

const categories: RosaryCategory[] = [
  { documentId: 'cat_psalms', slug: 'psalms', name: 'Salmos', description: 'Orações baseadas nos Salmos.' },
  { documentId: 'cat_saints', slug: 'saints', name: 'Santos', description: 'Orações dos santos.' },
  { documentId: 'cat_peace', slug: 'peace', name: 'Paz' }
]

const rosary = (id: number, title: string, extra: Partial<CustomRosaryPrayer> = {}): CustomRosaryPrayer => ({
  id,
  title,
  share_status: 'pending_review',
  created_at: '2026-09-26T12:00:00Z',
  author: { id: 7, name: 'Marcos Teixeira', submissions_count: 12, approved_count: 9 },
  ...extra
})

const api = {
  fetchCustomRosaries: vi.fn(),
  fetchCustomRosary: vi.fn(),
  fetchRosaryCategories: vi.fn(),
  approveCustomRosary: vi.fn(),
  rejectCustomRosary: vi.fn()
}

vi.mock('./useOrdoApi', () => ({ useOrdoApi: () => api }))

const { suggestCategory, useRosaryModeration } = await import('./useRosaryModeration')

const page = [rosary(1, 'Salmo 6'), rosary(2, 'Salmo 8'), rosary(3, 'Oração pela Paz')]

beforeEach(() => {
  vi.clearAllMocks()
  api.fetchCustomRosaries.mockResolvedValue({ custom_rosary_prayers: page, pagination: { total: 200, limit: 20, offset: 0, count: 3 } })
  api.fetchCustomRosary.mockImplementation(async (id: number) => ({ custom_rosary_prayer: { ...page.find(item => item.id === id), expanded_steps: [] } }))
  api.fetchRosaryCategories.mockResolvedValue({ rosary_categories: categories })
})

describe('suggestCategory', () => {
  it('suggests Salmos for a psalm and says why', () => {
    expect(suggestCategory('Salmos 23', categories)).toMatchObject({ category: { slug: 'psalms' }, reason: 'o título começa com “Salmo”' })
  })

  it('reads accents and saints in the title', () => {
    expect(suggestCategory('Entre pela porta do meu coração - São João Crisóstomo', categories)?.category.slug).toBe('saints')
  })

  it('suggests nothing when no rule matches a category the CMS has', () => {
    expect(suggestCategory('Que sejamos um - Alan Jones', categories)).toBeNull()
  })
})

describe('useRosaryModeration', () => {
  it('asks the API for the oldest first by default, then for the newest or by title', async () => {
    const moderation = useRosaryModeration()
    await moderation.load()
    expect(api.fetchCustomRosaries).toHaveBeenLastCalledWith(expect.objectContaining({ share_status: 'pending_review', sort: 'created_at', direction: 'asc', limit: 20, offset: 0 }))

    await moderation.setOrder('newest')
    expect(api.fetchCustomRosaries).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'created_at', direction: 'desc' }))

    await moderation.setOrder('title')
    expect(api.fetchCustomRosaries).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'title', direction: 'asc' }))
  })

  it('opens the first prayer with the slug from its title and the suggested category', async () => {
    const moderation = useRosaryModeration()
    await moderation.loadCategories()
    await moderation.load()
    await flushPromises()

    expect(moderation.selected.value?.title).toBe('Salmo 6')
    expect(moderation.slug.value).toBe('salmo-6')
    expect(moderation.categorySelection.value).toEqual({ mode: 'existing', slug: 'psalms', documentId: 'cat_psalms' })
    expect(moderation.canApprove.value).toBe(true)
    expect(moderation.seriesOnPage.value).toBe(2)
  })

  it('cannot approve until a category is chosen', async () => {
    const moderation = useRosaryModeration()
    await moderation.load()
    await moderation.select(page[2])
    await flushPromises()

    expect(moderation.categorySelection.value).toBeNull()
    expect(moderation.canApprove.value).toBe(false)
    await moderation.approve()
    expect(api.approveCustomRosary).not.toHaveBeenCalled()
  })

  it('approves, takes the prayer off the list and opens the next one', async () => {
    api.approveCustomRosary.mockResolvedValue({ custom_rosary_prayer: { ...page[0], share_status: 'approved' } })
    const moderation = useRosaryModeration()
    await moderation.loadCategories()
    await moderation.load()
    await flushPromises()
    // After the decision the page refills from the API, which no longer has it.
    api.fetchCustomRosaries.mockResolvedValue({ custom_rosary_prayers: page.slice(1), pagination: { total: 199, limit: 20, offset: 0, count: 2 } })

    await moderation.approve()
    await flushPromises()

    expect(api.approveCustomRosary).toHaveBeenCalledWith(1, { mode: 'existing', slug: 'psalms', documentId: 'cat_psalms' }, 'salmo-6')
    expect(moderation.items.value.map(item => item.id)).not.toContain(1)
    expect(moderation.selected.value?.id).toBe(2)
    expect(moderation.total.value).toBe(199)
    expect(moderation.session.approved).toBe(1)
    expect(moderation.notice.value?.text).toBe('“Salmo 6” aprovado. Abrindo o próximo.')
  })

  it('keeps a slug written by hand when the detail arrives', async () => {
    let resolveDetail: (value: unknown) => void = () => {}
    api.fetchCustomRosary.mockImplementationOnce(() => new Promise(resolve => { resolveDetail = resolve }))
    const moderation = useRosaryModeration()
    const opening = moderation.select(page[0])
    moderation.editSlug('salmo-6-arc')
    resolveDetail({ custom_rosary_prayer: { ...page[0], expanded_steps: [] } })
    await opening

    expect(moderation.slug.value).toBe('salmo-6-arc')
  })

  it('rejects with the reason that was written', async () => {
    api.rejectCustomRosary.mockResolvedValue({ custom_rosary_prayer: { ...page[0], share_status: 'rejected' } })
    const moderation = useRosaryModeration()
    await moderation.load()
    await flushPromises()
    moderation.rejectionReason.value = 'Duplicado do Salmo 6 já publicado.'

    await moderation.reject()

    expect(api.rejectCustomRosary).toHaveBeenCalledWith(1, 'Duplicado do Salmo 6 já publicado.')
    expect(moderation.session.rejected).toBe(1)
  })
})
