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

const mountModal = () => mount(RosaryReviewModal, {
  props: {
    rosary,
    loading: false,
    actionLoading: false,
    categories,
    categoriesLoading: false,
    categoriesError: null,
    categorySelection: null,
    strapiSlug: '',
    rejectionReason: ''
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

    expect(wrapper.emitted('update:categorySelection')?.at(-1)?.[0]).toEqual({
      mode: 'new',
      slug: 'oracoes-sazonais',
      name: 'Orações sazonais',
      description: '',
      icon: ''
    })
    expect((wrapper.get('button.ordo-button--primary').element as HTMLButtonElement).disabled).toBe(false)
  })
})
