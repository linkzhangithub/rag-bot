<template>
  <button 
    :class="buttonClass" 
    :type="type" 
    @click="$emit('click')"
    :disabled="disabled"
  >
    <slot name="icon" v-if="$slots.icon"></slot>
    <span><slot></slot></span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (val) => ['primary', 'secondary', 'outline', 'ghost'].includes(val)
  },
  size: {
    type: String,
    default: 'md',
    validator: (val) => ['sm', 'md', 'lg'].includes(val)
  },
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const buttonClass = computed(() => [
  'app-button',
  `app-button--${props.variant}`,
  `app-button--${props.size}`,
  { 'app-button--disabled': props.disabled }
])
</script>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  font-size: 15px;
}

.app-button--primary {
  background: var(--accent);
  color: white;
}

.app-button--primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 10px 25px -5px rgba(167, 139, 250, 0.35);
}

.app-button--secondary {
  background: var(--accent-bg);
  color: var(--accent);
  border: 2px solid var(--accent-border);
}

.app-button--secondary:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}

.app-button--outline {
  background: transparent;
  color: var(--text-h);
  border: 2px solid var(--border);
}

.app-button--outline:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.app-button--ghost {
  background: transparent;
  color: var(--text-h);
  border: none;
}

.app-button--ghost:hover:not(:disabled) {
  background: var(--accent-bg);
  color: var(--accent);
}

.app-button--sm {
  padding: 6px 12px;
  font-size: 13px;
}

.app-button--md {
  padding: 10px 20px;
  font-size: 15px;
}

.app-button--lg {
  padding: 14px 28px;
  font-size: 16px;
}

.app-button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.app-button svg {
  flex-shrink: 0;
}
</style>
