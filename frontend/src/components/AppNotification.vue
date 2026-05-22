<template>
  <Transition name="notification">
    <div v-if="show" class="notification" :class="type">
      <svg class="notification-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="type === 'info'">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </template>
        <template v-else-if="type === 'success'">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="16 10 10 16 8 14"/>
        </template>
        <template v-else-if="type === 'error'">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </template>
        <template v-else-if="type === 'warning'">
          <path d="M12 9v4"/>
          <path d="M12 17h.01"/>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
        </template>
      </svg>
      <span class="notification-message">{{ message }}</span>
      <button @click="$emit('close')" class="notification-close" aria-label="关闭通知">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
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
