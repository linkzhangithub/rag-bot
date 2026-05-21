<template>
  <div class="feature-card">
    <div class="feature-icon">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path v-if="icon === 'document'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline v-if="icon === 'document'" points="14 2 14 8 20 8" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line v-if="icon === 'document'" x1="16" y1="13" x2="8" y2="13" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line v-if="icon === 'document'" x1="16" y1="17" x2="8" y2="17" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <polyline v-if="icon === 'document'" points="10 9 9 9 8 9" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        
        <circle v-if="icon === 'search'" cx="11" cy="11" r="8" stroke="var(--accent)" stroke-width="2"/>
        <path v-if="icon === 'search'" d="m21 21-4.35-4.35" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        
        <path v-if="icon === 'message'" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        
        <path v-if="icon === 'shield'" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'document',
    validator: (val) => ['document', 'search', 'message', 'shield'].includes(val)
  }
})
</script>

<style scoped>
.feature-card {
  padding: 24px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  aspect-ratio: 1;
  justify-content: center;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
  border-color: var(--accent-border);
}

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.feature-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0 0 6px 0;
}

.feature-card p {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text);
  margin: 0;
}

@media (max-width: 640px) {
  .feature-card {
    padding: 24px 16px;
    aspect-ratio: auto;
    min-height: auto;
  }

  .feature-icon {
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
  }

  .feature-card h3 {
    font-size: 18px;
    margin-bottom: 8px;
  }

  .feature-card p {
    font-size: 14px;
  }
}
</style>
