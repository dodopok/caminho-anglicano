import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseNavigationCard from './BaseNavigationCard.vue'

// Mock NuxtLink
const NuxtLinkStub = {
  name: 'NuxtLink',
  template: '<a :href="to" :aria-label="ariaLabel"><slot /></a>',
  props: ['to', 'ariaLabel'],
}

describe('BaseNavigationCard', () => {
  it('should render with required props', () => {
    const wrapper = mount(BaseNavigationCard, {
      props: {
        icon: 'location',
        title: 'Test Title',
        description: 'Test Description',
        ariaLabel: 'Test Aria Label',
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Test Title')
    expect(wrapper.text()).toContain('Test Description')
  })

  it('should render as NuxtLink when using "to" prop', () => {
    const wrapper = mount(BaseNavigationCard, {
      props: {
        to: '/test-page',
        icon: 'location',
        title: 'Test Title',
        description: 'Test Description',
        ariaLabel: 'Test Aria Label',
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    expect(wrapper.find('a').exists()).toBe(true)
    expect(wrapper.find('a').attributes('aria-label')).toBe('Test Aria Label')
  })

  it('should render as external link when using "href" prop', () => {
    const wrapper = mount(BaseNavigationCard, {
      props: {
        href: 'https://example.com',
        icon: 'location',
        title: 'External Link',
        description: 'External Description',
        ariaLabel: 'External Link',
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('https://example.com')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('should render as external link when external prop is true', () => {
    const wrapper = mount(BaseNavigationCard, {
      props: {
        to: '/test',
        icon: 'location',
        title: 'Test',
        description: 'Test',
        ariaLabel: 'Test',
        external: true,
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const link = wrapper.find('a')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('should render correct icon for each icon type', () => {
    const icons = ['location', 'chart', 'book', 'clipboard']

    icons.forEach((iconName) => {
      const wrapper = mount(BaseNavigationCard, {
        props: {
          to: '/test',
          icon: iconName,
          title: 'Test',
          description: 'Test',
          ariaLabel: 'Test',
        },
        global: {
          stubs: {
            NuxtLink: NuxtLinkStub,
          },
        },
      })

      const svg = wrapper.find('svg')
      expect(svg.exists()).toBe(true)
      expect(svg.find('path').exists()).toBe(true)
    })
  })

  it('should have proper accessibility attributes', () => {
    const wrapper = mount(BaseNavigationCard, {
      props: {
        to: '/localizador',
        icon: 'location',
        title: 'Localizador de Igrejas',
        description: 'Encontre igrejas anglicanas perto de você',
        ariaLabel: 'Acessar o localizador de igrejas',
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    expect(wrapper.find('a').attributes('aria-label')).toBe('Acessar o localizador de igrejas')
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('should apply hover styles via classes', () => {
    const wrapper = mount(BaseNavigationCard, {
      props: {
        to: '/test',
        icon: 'location',
        title: 'Test',
        description: 'Test',
        ariaLabel: 'Test',
      },
      global: {
        stubs: {
          NuxtLink: NuxtLinkStub,
        },
      },
    })

    const card = wrapper.find('a')
    expect(card.classes()).toContain('hover:shadow-xl')
    expect(card.classes()).toContain('transition-all')
  })

  it('should render with all icon options', () => {
    const iconTypes = {
      location: 'Location Icon',
      chart: 'Chart Icon',
      book: 'Book Icon',
      clipboard: 'Clipboard Icon',
    }

    Object.entries(iconTypes).forEach(([icon, _title]) => {
      const wrapper = mount(BaseNavigationCard, {
        props: {
          to: '/test',
          icon,
          title: 'Test Title',
          description: 'Test Description',
          ariaLabel: 'Test',
        },
        global: {
          stubs: {
            NuxtLink: NuxtLinkStub,
          },
        },
      })

      expect(wrapper.find('svg path').exists()).toBe(true)
    })
  })
})
