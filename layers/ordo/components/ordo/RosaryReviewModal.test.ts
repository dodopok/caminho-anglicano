import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RosaryReviewModal from './RosaryReviewModal.vue'

const rosary = {
  id: 42,
  title: 'Rosário de teste',
  locale: 'pt-BR',
  share_status: 'pending_review' as const,
  expanded_steps: []
}

const categories = [{
  documentId: 'cat_seasonal',
  slug: 'seasonal',
  name: 'Temporais',
  description: 'Orações para os tempos do ano.',
  icon: '✦'
}]

const mountModal = (overrides: Record<string, unknown> = {}) => mount(RosaryReviewModal, {
  props: {
    rosary,
    loading: false,
    actionLoading: false,
    categories,
    categoriesLoading: false,
    categoriesError: null,
    categorySelection: null,
    strapiSlug: '',
    rejectionReason: '',
    ...overrides
  }
})

describe('RosaryReviewModal category flow', () => {
  it('starts without a category and blocks approval', () => {
    const wrapper = mountModal()
    const approve = wrapper.get('button.ordo-button--primary')

    expect(wrapper.get('select').element.value).toBe('')
    expect((approve.element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('Nenhuma categoria é escolhida automaticamente.')
  })

  it('emits an existing category using documentId and slug', async () => {
    const wrapper = mountModal()

    await wrapper.get('select').setValue('cat_seasonal')
    await wrapper.get('input[placeholder="rosario-pela-familia"]').setValue('rosario-de-teste')
    await wrapper.setProps({ strapiSlug: 'rosario-de-teste' })

    expect(wrapper.emitted('update:categorySelection')?.at(-1)?.[0]).toEqual({
      mode: 'existing',
      slug: 'seasonal',
      documentId: 'cat_seasonal'
    })
    expect((wrapper.get('button.ordo-button--primary').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('collects a new category without using a default', async () => {
    const wrapper = mountModal()

    await wrapper.get('input[value="new"]').setValue(true)
    await wrapper.get('input[placeholder="Ex.: Rosário pela criação"]').setValue('Orações sazonais')
    await wrapper.get('input[placeholder="rosario-pela-criacao"]').setValue('oracoes-sazonais')
    await wrapper.get('input[placeholder="rosario-pela-familia"]').setValue('oracoes-sazonais')
    await wrapper.setProps({ strapiSlug: 'oracoes-sazonais' })

    expect(wrapper.emitted('update:categorySelection')?.at(-1)?.[0]).toEqual({
      mode: 'new',
      slug: 'oracoes-sazonais',
      name: 'Orações sazonais',
      description: '',
      icon: ''
    })
    expect((wrapper.get('button.ordo-button--primary').element as HTMLButtonElement).disabled).toBe(false)
  })

  it('requires the Strapi slug before approval', async () => {
    const wrapper = mountModal()

    await wrapper.get('select').setValue('cat_seasonal')

    expect((wrapper.get('button.ordo-button--primary').element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.text()).toContain('Informe o slug que será usado na publicação.')

    await wrapper.get('input[placeholder="rosario-pela-familia"]').setValue('rosario-de-teste')
    await wrapper.setProps({ strapiSlug: 'rosario-de-teste' })

    expect((wrapper.get('button.ordo-button--primary').element as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('RosaryReviewModal slug suggestion', () => {
  it('suggests a slug from the title when the review opens empty', () => {
    const wrapper = mountModal()

    expect(wrapper.emitted('update:strapiSlug')?.at(0)?.[0]).toBe('rosario-de-teste')
  })

  it('leaves a slug the editor already wrote alone', () => {
    const wrapper = mountModal({ strapiSlug: 'slug-escolhido-a-mao' })

    expect(wrapper.emitted('update:strapiSlug')).toBeUndefined()
  })

  it('offers the title again when the slug drifted from it', async () => {
    const wrapper = mountModal({ strapiSlug: 'outra-coisa' })
    const suggestion = wrapper.get('button.ordo-slug-suggestion')

    expect(suggestion.text()).toContain('rosario-de-teste')

    await suggestion.trigger('click')
    expect(wrapper.emitted('update:strapiSlug')?.at(-1)?.[0]).toBe('rosario-de-teste')
  })

  it('stops offering once the slug matches the title', () => {
    const wrapper = mountModal({ strapiSlug: 'rosario-de-teste' })

    expect(wrapper.find('button.ordo-slug-suggestion').exists()).toBe(false)
    expect(wrapper.text()).toContain('sugerido a partir do título')
  })
})

describe('RosaryReviewModal queue navigation', () => {
  const queueProps = {
    queuePosition: 2,
    queueTotal: 5,
    queuePage: 3,
    queueTotalPages: 7,
    hasPrevious: true,
    hasNext: true
  }

  it('says where the review sits in the queue it was opened from', () => {
    const wrapper = mountModal(queueProps)

    expect(wrapper.text()).toContain('2 de 5 nesta página · página 3 de 7')
  })

  it('walks the queue without closing the review', async () => {
    const wrapper = mountModal(queueProps)

    await wrapper.get('button[aria-label="Revisar o próximo da fila"]').trigger('click')
    await wrapper.get('button[aria-label="Revisar o anterior da fila"]').trigger('click')

    expect(wrapper.emitted('next')).toHaveLength(1)
    expect(wrapper.emitted('previous')).toHaveLength(1)
  })

  it('stops at the ends of the queue', () => {
    const wrapper = mountModal({ ...queueProps, hasPrevious: false, hasNext: false })
    const previous = wrapper.get('button[aria-label="Revisar o anterior da fila"]')
    const next = wrapper.get('button[aria-label="Revisar o próximo da fila"]')

    expect((previous.element as HTMLButtonElement).disabled).toBe(true)
    expect((next.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('hides the navigation when the review was not opened from a queue', () => {
    const wrapper = mountModal()

    expect(wrapper.find('.ordo-queue-nav').exists()).toBe(false)
  })

  it('reports the decision that was just taken', () => {
    const wrapper = mountModal({ ...queueProps, decisionNotice: '“Rosário de teste” aprovado. Próximo da fila aberto.' })

    expect(wrapper.get('.ordo-modal__notice').text()).toContain('aprovado')
  })
})
