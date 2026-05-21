<template>
  <div :class="['logo', sizeClass]">
    <svg :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" :fill="fillColor"/>
      <path d="M2 17L12 22L22 17" :stroke="strokeColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 12L12 17L22 12" :stroke="strokeColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span v-if="showText" class="logo-text">{{ text }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (val) => ['sm', 'md', 'lg'].includes(val)
  },
  showText: {
    type: Boolean,
    default: true
  },
  text: {
    type: String,
    default: 'RAG Bot'
  },
  fillColor: {
    type: String,
    default: 'var(--accent)'
  },
  strokeColor: {
    type: String,
    default: 'var(--accent)'
  }
})

const svgSize = computed(() => {
  const sizes = { sm: 20, md: 24, lg: 32 }
  return sizes[props.size]
})

const sizeClass = computed(() => `logo-${props.size}`)
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-weight: 600;
  color: var(--text-h);
}

.logo-sm .logo-text {
  font-size: 14px;
}

.logo-md .logo-text {
  font-size: 16px;
}

.logo-lg .logo-text {
  font-size: 20px;
}
</style>
