import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DataExplorerModal from './DataExplorerModal.vue'

const columns = [
  { key: 'title', label: 'Rosário', sortable: true },
  { key: 'created_at', label: 'Criado em', sortable: true }
]

const rows = [
  { id: 1, values: { title: 'Primeiro', created_at: '2026-08-20' } },
  { id: 2, values: { title: 'Segundo', created_at: '2026-08-19' } }
]

const mountRemoteModal = () => mount(DataExplorerModal, {
  props: {
    title: 'Rosários compartilhados',
    columns,
    rows,
    remote: true,
    remoteSearch: '',
    remoteSortKey: 'created_at',
    remoteSortDirection: 'desc' as const,
    remotePagination: { currentPage: 2, totalPages: 4, total: 20 },
    remoteLoading: false
  }
})

describe('DataExplorerModal remote mode', () => {
  it('delegates search to the server instead of filtering the current page', async () => {
    const wrapper = mountRemoteModal()
    const input = wrapper.get('input[type="search"]')

    await input.setValue('segundo')
    await wrapper.get('button.ordo-button--quiet').trigger('click')

    expect(wrapper.text()).toContain('Primeiro')
    expect(wrapper.text()).toContain('Segundo')
    expect(wrapper.emitted('update:remote-search')?.at(-1)?.[0]).toBe('segundo')
    expect(wrapper.emitted('remote-search')).toHaveLength(1)
  })

  it('delegates sorting and remote pagination', async () => {
    const wrapper = mountRemoteModal()

    await wrapper.get('th button').trigger('click')
    await wrapper.get('.ordo-data-modal__pagination button:last-child').trigger('click')

    expect(wrapper.emitted('remote-sort')?.at(-1)?.[0]).toBe('title')
    expect(wrapper.emitted('remote-sort')?.at(-1)?.[1]).toBe('desc')
    expect(wrapper.emitted('remote-page')?.at(-1)?.[0]).toBe(1)
  })
})
