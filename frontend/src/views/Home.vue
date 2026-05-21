<template>
  <div class="home">
    <header class="navbar">
      <div class="nav-container">
        <Logo size="lg" />
        <AppButton variant="primary" size="sm" @click="goToChat"
          >开始聊天</AppButton
        >
      </div>
    </header>

    <main class="main-content">
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">
            基于文档的
            <span class="gradient-text">智能对话</span>
          </h1>
          <p class="hero-description">
            上传你的文档，让 AI 帮你理解、分析和回答问题。强大的 RAG
            技术确保回答准确可信。
          </p>
          <div class="hero-actions">
            <AppButton variant="primary" size="lg" @click="goToChat">
              <template #icon>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </template>
              开始体验
            </AppButton>
            <a href="#features" class="secondary-link">了解更多</a>
          </div>
        </div>
        <div class="hero-visual">
          <ChatDemo />
        </div>
      </section>

      <section id="features" class="features">
        <div class="features-header">
          <h2>核心功能</h2>
          <p>强大的功能让文档交互更加智能</p>
        </div>
        <div class="features-grid">
          <FeatureCard
            title="文档上传"
            description="支持多种格式的文档上传，轻松管理你的知识库"
            icon="document"
          />
          <FeatureCard
            title="智能检索"
            description="基于向量相似度的精准检索，快速找到相关内容"
            icon="search"
          />
          <FeatureCard
            title="自然对话"
            description="像与人交流一样与 AI 对话，获得自然流畅的回答"
            icon="message"
          />
          <FeatureCard
            title="隐私保护"
            description="文档存储在本地，你的数据完全由你掌控"
            icon="shield"
          />
        </div>
      </section>

      <section class="cta-section">
        <div class="cta-content">
          <h2>准备好开始了吗？</h2>
          <p>上传文档，立即体验智能对话的魅力</p>
          <AppButton variant="primary" size="lg" @click="goToChat">
            <template #icon>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </template>
            立即开始
          </AppButton>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="footer-content">
        <Logo size="sm" />
        <p class="footer-text">基于 RAG 技术的智能问答系统 · 2024</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import Logo from "../components/Logo.vue";
import AppButton from "../components/AppButton.vue";
import ChatDemo from "../components/ChatDemo.vue";
import FeatureCard from "../components/FeatureCard.vue";

const router = useRouter();

const goToChat = () => {
  router.push("/chat");
};
</script>

<style scoped>
.home {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  overflow-x: hidden;
}

.navbar {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.main-content {
  flex: 1;
}

.hero {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-title {
  font-size: 56px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--text-h);
  margin: 0;
  letter-spacing: -0.02em;
}

.gradient-text {
  background: linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 18px;
  line-height: 1.6;
  color: var(--text);
  margin: 0;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  align-items: center;
}

.hero-actions :deep(.app-button),
.secondary-link {
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  min-width: 160px;
  width: 160px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  border: none;
  box-sizing: border-box;
}

.hero-actions :deep(.app-button) {
  background: var(--accent);
  color: white;
}

.secondary-link {
  border: 2px solid var(--border);
  background: transparent;
  color: var(--text-h);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
}

.secondary-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.features {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;
}

.features-header {
  text-align: center;
  margin-bottom: 60px;
}

.features-header h2 {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-h);
  margin: 0 0 12px 0;
}

.features-header p {
  font-size: 18px;
  color: var(--text);
  margin: 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

@media (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (max-width: 640px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}

.cta-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 24px;
}

.cta-content {
  background: linear-gradient(
    135deg,
    var(--accent-bg) 0%,
    var(--secondary-bg) 100%
  );
  border-radius: 24px;
  padding: 60px 40px;
  text-align: center;
  border: 1px solid var(--accent-border);
}

.cta-content h2 {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-h);
  margin: 0 0 12px 0;
}

.cta-content p {
  font-size: 18px;
  color: var(--text);
  margin: 0 0 32px 0;
}

.footer {
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.footer-text {
  font-size: 14px;
  color: var(--text);
  margin: 0;
}

@media (prefers-color-scheme: dark) {
  .navbar {
    background: rgba(22, 23, 29, 0.8);
  }
}

@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 60px 24px;
  }
  .hero-title {
    font-size: 42px;
  }
}

@media (max-width: 640px) {
  .nav-container {
    padding: 12px 16px;
  }
  .hero {
    padding: 40px 16px;
    text-align: center;
  }
  .hero-title {
    font-size: 32px;
  }
  .hero-description {
    font-size: 16px;
  }
  .hero-actions {
    flex-direction: column;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
    align-items: center;
  }
  .hero-actions :deep(.app-button),
  .secondary-link {
    width: 100%;
    min-width: 200px;
    max-width: 300px;
    padding: 14px 24px;
    font-size: 16px;
    height: auto;
    box-sizing: border-box;
  }
  .features {
    padding: 48px 16px;
  }
  .features-header h2 {
    font-size: 28px;
  }
  .cta-section {
    padding: 48px 16px;
  }
  .cta-content {
    padding: 40px 24px;
  }
  .cta-content h2 {
    font-size: 28px;
  }
  .footer-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
