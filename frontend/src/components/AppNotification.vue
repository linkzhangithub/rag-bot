<template>
  <Transition name="notification">
    <div v-if="show" class="notification" :class="type">
      <span class="notification-icon">{{ icon }}</span>
      <span class="notification-message">{{ message }}</span>
      <button @click="$emit('close')" class="notification-close">✕</button>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info',
    validator: (val) => ['info', 'success', 'error', 'warning'].includes(val)
  }
})

defineEmits(['close'])

const icon = computed(() => {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️'
  }
  return icons[props.type] || icons.info
})
</script>

<style scoped>
.notification {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 1000;
  box-shadow: 0 4px 25px -5px rgba(0, 0, 0, 0.15);
}

.notification-icon {
  font-size: 16px;
}

.notification-message {
  flex: 1;
}

.notification-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}

.notification.info {
  background: #3b82f6;
  color: white;
}

.notification.success {
  background: #22c55e;
  color: white;
}

.notification.error {
  background: #ef4444;
  color: white;
}

.notification.warning {
  background: #f59e0b;
  color: white;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.2s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(50px);
}

@media (max-width: 768px) {
  .notification {
    top: 70px;
    right: 16px;
    left: 16px;
    padding: 12px 16px;
  }
}
</style>
