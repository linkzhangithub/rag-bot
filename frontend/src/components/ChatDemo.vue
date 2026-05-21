<template>
  <div class="chat-demo">
    <div class="message ai-message">
      <div class="message-avatar">
        <img src="/src/assets/cat-avatar.png" alt="AI" class="ai-avatar" />
      </div>
      <div class="message-content">
        你好！我是基于文档的智能助手。上传文档后，我可以帮你回答相关问题。
      </div>
    </div>
    <div class="message user-message">
      <div class="message-content">如何使用这个产品？</div>
      <div class="message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
    </div>
    <div class="message ai-message typing">
      <div class="message-avatar">
        <img src="/src/assets/cat-avatar.png" alt="AI" class="ai-avatar" />
      </div>
      <div class="message-content">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.chat-demo {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
  border-radius: 20px;
  border: 1px solid var(--border);
  padding: 20px;
  box-shadow: var(--shadow);
  box-sizing: border-box;
  margin: 0 auto;
}

@media (max-width: 640px) {
  .chat-demo {
    max-width: calc(100% - 32px);
    padding: 16px;
    margin: 0 auto;
  }
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.message:last-child {
  margin-bottom: 0;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  flex-shrink: 0;
}

.ai-message .message-avatar {
  background: var(--accent);
  color: white;
  padding: 2px;
}

.ai-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.user-message {
  flex-direction: row-reverse;
}

.user-message .message-avatar {
  background: var(--text-h);
  color: white;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 80%;
}

.ai-message .message-content {
  background: var(--accent-bg);
  color: var(--text-h);
  border-bottom-left-radius: 4px;
}

.user-message .message-content {
  background: var(--accent);
  color: white;
  border-bottom-right-radius: 4px;
}

.typing .message-content {
  display: flex;
  gap: 6px;
  padding: 16px 20px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-4px);
  }
}
</style>
