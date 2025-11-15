import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from './StatusBadge.vue'

describe('StatusBadge', () => {
  it('should render pending status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'pending',
      },
    })

    expect(wrapper.text()).toBe('Pendente')
    expect(wrapper.find('span').classes()).toContain('bg-yellow-100')
    expect(wrapper.find('span').classes()).toContain('text-yellow-800')
  })

  it('should render approved status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'approved',
      },
    })

    expect(wrapper.text()).toBe('Aprovado')
    expect(wrapper.find('span').classes()).toContain('bg-green-100')
    expect(wrapper.find('span').classes()).toContain('text-green-800')
  })

  it('should render rejected status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'rejected',
      },
    })

    expect(wrapper.text()).toBe('Rejeitado')
    expect(wrapper.find('span').classes()).toContain('bg-red-100')
    expect(wrapper.find('span').classes()).toContain('text-red-800')
  })

  it('should apply base styling classes', () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'pending',
      },
    })

    const span = wrapper.find('span')
    expect(span.classes()).toContain('inline-flex')
    expect(span.classes()).toContain('items-center')
    expect(span.classes()).toContain('px-2.5')
    expect(span.classes()).toContain('py-0.5')
    expect(span.classes()).toContain('rounded-full')
    expect(span.classes()).toContain('text-xs')
    expect(span.classes()).toContain('font-medium')
  })

  it('should update when status prop changes', async () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'pending',
      },
    })

    expect(wrapper.text()).toBe('Pendente')

    await wrapper.setProps({ status: 'approved' })

    expect(wrapper.text()).toBe('Aprovado')
    expect(wrapper.find('span').classes()).toContain('bg-green-100')
  })

  it('should handle all status transitions', async () => {
    const wrapper = mount(StatusBadge, {
      props: {
        status: 'pending',
      },
    })

    // Pending -> Approved
    await wrapper.setProps({ status: 'approved' })
    expect(wrapper.text()).toBe('Aprovado')

    // Approved -> Rejected
    await wrapper.setProps({ status: 'rejected' })
    expect(wrapper.text()).toBe('Rejeitado')

    // Rejected -> Pending
    await wrapper.setProps({ status: 'pending' })
    expect(wrapper.text()).toBe('Pendente')
  })
})
