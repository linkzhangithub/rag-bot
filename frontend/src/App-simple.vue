<template>
  <div id="app">
    <h1>RAG Bot - Vue 3 Frontend</h1>
    <p>前端已成功启动！</p>
    <p>后端状态: <span :style="{ color: backendStatus ? 'green' : 'red' }">
      {{ backendStatus ? '已连接' : '未连接' }}
    </span></p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const backendStatus = ref(false)

onMounted(async () => {
  try {
    const response = await axios.get('/health')
    backendStatus.value = response.data.success
  } catch (error) {
    console.error('Backend connection failed:', error)
    backendStatus.value = false
  }
})
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 50px;
}
</style>
