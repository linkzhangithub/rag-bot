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
        <p class="footer-text">基于 RAG 技术的智能问答系统 · 2026</p>
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
import "@/assets/styles/home.css";

const router = useRouter();

const goToChat = () => {
  router.push("/chat");
};
</script>
