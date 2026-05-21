import { ref } from 'vue'

const notification = ref({
  show: false,
  message: '',
  type: 'info'
})

export function useNotification() {
  const show = (message, type = 'info') => {
    notification.value = { show: true, message, type }
    setTimeout(() => {
      notification.value.show = false
    }, 3000)
  }

  const success = (message) => show(message, 'success')
  const error = (message) => show(message, 'error')
  const info = (message) => show(message, 'info')
  const warning = (message) => show(message, 'warning')

  const close = () => {
    notification.value.show = false
  }

  return {
    notification,
    show,
    success,
    error,
    info,
    warning,
    close
  }
}
