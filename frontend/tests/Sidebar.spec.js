import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import Sidebar from '../src/components/Sidebar.vue'
import DocumentUpload from '../src/components/DocumentUpload.vue'
import DocumentList from '../src/components/DocumentList.vue'

describe('Sidebar Component', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(Sidebar, {
      props: {
        documents: [],
        isOpen: false
      },
      global: {
        components: {
          DocumentUpload,
          DocumentList
        }
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  it('should render the sidebar', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.sidebar').exists()).toBe(true)
  })

  it('should have correct ARIA attributes', () => {
    const sidebar = wrapper.find('.sidebar')
    expect(sidebar.attributes('role')).toBe('navigation')
    expect(sidebar.attributes('aria-label')).toBe('侧边栏导航')
    expect(sidebar.attributes('aria-expanded')).toBe('true')
  })

  it('should display logo and title when not collapsed', () => {
    expect(wrapper.find('.logo-container').exists()).toBe(true)
    expect(wrapper.find('.logo-text h1').text()).toBe('知识库问答')
    expect(wrapper.find('.logo-subtitle').text()).toBe('RAG System')
  })

  it('should collapse when collapse button is clicked', async () => {
    expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
    
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    
    expect(wrapper.find('.sidebar').classes()).toContain('collapsed')
    expect(wrapper.find('.logo-container').exists()).toBe(false)
    expect(wrapper.find('.logo-icon.collapsed').exists()).toBe(true)
  })

  it('should expand when collapse button is clicked again', async () => {
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    expect(wrapper.find('.sidebar').classes()).toContain('collapsed')
    
    await collapseBtn.trigger('click')
    expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
    expect(wrapper.find('.logo-container').exists()).toBe(true)
  })

  it('should hide upload section when collapsed', async () => {
    const uploadSection = wrapper.find('.upload-section')
    expect(uploadSection.classes()).not.toContain('hidden')
    
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    
    expect(wrapper.find('.upload-section').classes()).toContain('hidden')
  })

  it('should hide hot questions when collapsed', async () => {
    expect(wrapper.find('.hot-questions').exists()).toBe(true)
    
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    
    expect(wrapper.find('.hot-questions').exists()).toBe(false)
  })

  it('should hide sidebar footer when collapsed', async () => {
    expect(wrapper.find('.sidebar-footer').exists()).toBe(true)
    
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    
    expect(wrapper.find('.sidebar-footer').exists()).toBe(false)
  })

  it('should display documents when provided', async () => {
    wrapper = mount(Sidebar, {
      props: {
        documents: [
          { name: 'test.pdf', chunks: 10, size: 1024, uploadedAt: '2024-01-01' }
        ],
        isOpen: false
      },
      global: {
        components: {
          DocumentUpload,
          DocumentList
        }
      }
    })
    
    expect(wrapper.find('.doc-count').text()).toBe('1')
  })

  it('should emit quick-ask event when question chip is clicked', async () => {
    const questionChip = wrapper.find('.question-chip')
    await questionChip.trigger('click')
    
    expect(wrapper.emitted('quick-ask')).toBeTruthy()
    expect(wrapper.emitted('quick-ask')[0][0]).toBe('什么是RAG？')
  })

  it('should have focus-visible styles for accessibility', async () => {
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('focus')
    
    const styles = window.getComputedStyle(collapseBtn.element)
    expect(styles.outlineStyle).toBe('solid')
  })

  it('should respond to isOpen prop changes', async () => {
    expect(wrapper.find('.sidebar').classes()).not.toContain('open')
    
    await wrapper.setProps({ isOpen: true })
    expect(wrapper.find('.sidebar').classes()).toContain('open')
    
    await wrapper.setProps({ isOpen: false })
    expect(wrapper.find('.sidebar').classes()).not.toContain('open')
  })

  it('should reset collapsed state when isOpen changes to false', async () => {
    const collapseBtn = wrapper.find('.collapse-btn')
    await collapseBtn.trigger('click')
    expect(wrapper.find('.sidebar').classes()).toContain('collapsed')
    
    await wrapper.setProps({ isOpen: false })
    await wrapper.setProps({ isOpen: true })
    
    expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
  })

  it('should emit upload-success event', async () => {
    const documentUpload = wrapper.findComponent(DocumentUpload)
    documentUpload.vm.$emit('upload-success')
    
    expect(wrapper.emitted('upload-success')).toBeTruthy()
    expect(wrapper.find('.sidebar').classes()).not.toContain('collapsed')
  })

  it('should emit upload-error event', async () => {
    const documentUpload = wrapper.findComponent(DocumentUpload)
    documentUpload.vm.$emit('upload-error', 'Error message')
    
    expect(wrapper.emitted('upload-error')).toBeTruthy()
    expect(wrapper.emitted('upload-error')[0][0]).toBe('Error message')
  })

  it('should display correct statistics in footer', async () => {
    wrapper = mount(Sidebar, {
      props: {
        documents: [
          { name: 'doc1.pdf', chunks: 10 },
          { name: 'doc2.pdf', chunks: 20 }
        ],
        isOpen: false
      },
      global: {
        components: {
          DocumentUpload,
          DocumentList
        }
      }
    })
    
    expect(wrapper.find('.stat-value').text()).toBe('2')
    
    const statValues = wrapper.findAll('.stat-value')
    expect(statValues[0].text()).toBe('2')
    expect(statValues[1].text()).toBe('30')
  })
})
