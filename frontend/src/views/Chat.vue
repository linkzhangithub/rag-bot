<template>
  <div class="chat-page">
    <header class="chat-header">
      <div class="header-left">
        <AppButton variant="outline" size="sm" @click="goHome">
          <template #icon>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </template>
          返回首页
        </AppButton>
      </div>
      <div class="header-center">
        <Logo size="md" />
      </div>
    </header>
    <div class="chat-container">
      <Sidebar
        :documents="documents"
        :collapsed="sidebarCollapsed"
        :mobile-open="sidebarOpen"
        @delete-document="handleDeleteDocument"
        @upload-success="handleUploadSuccess"
        @upload-error="handleUploadError"
        @toggle="handleSidebarToggle"
      />
      <div
        v-if="sidebarOpen && isMobile"
        class="sidebar-overlay"
        @click="closeSidebar"
      ></div>
      <ChatArea
        :messages="messages"
        :is-generating="isGenerating"
        :documents="documents"
        @send="sendMessage"
        @quick-ask="sendMessage"
      />
    </div>
    <AppNotification
      :show="notification.show"
      :message="notification.message"
      :type="notification.type"
      @close="closeNotification"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import Logo from "../components/Logo.vue";
import AppButton from "../components/AppButton.vue";
import AppNotification from "../components/AppNotification.vue";
import Sidebar from "../components/Sidebar.vue";
import ChatArea from "../components/ChatArea.vue";
import { useChatStream } from "../composables/useChatStream";
import { useDocument } from "../composables/useDocument";
import { useNotification } from "../composables/useNotification";

const router = useRouter();
const {
  messages,
  isGenerating,
  sendMessage: sendChatMessage,
} = useChatStream();
const { documents, handleDelete, loadDocuments } = useDocument();
const { notification, success, error, close } = useNotification();

const sidebarOpen = ref(false);
const isMobile = ref(false);
const sidebarCollapsed = ref(true);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const goHome = () => {
  router.push("/");
};

const handleSidebarToggle = (isOpen) => {
  sidebarOpen.value = isOpen;
  sidebarCollapsed.value = !isOpen;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
  sidebarCollapsed.value = true;
};

const sendMessage = (content) => {
  sendChatMessage(content);
};

const handleDeleteDocument = async (name) => {
  if (!confirm(`确定要删除文档 "${name}" 吗？`)) return;
  try {
    await handleDelete(name);
    success(`文档 "${name}" 删除成功`);
  } catch (err) {
    error("删除失败: " + err.message);
  }
};

const handleUploadSuccess = () => {
  loadDocuments();
  success("文档上传成功");
};

const handleUploadError = (message) => {
  error("上传失败: " + message);
};

const closeNotification = () => {
  close();
};

onMounted(() => {
  loadDocuments();
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>

<style scoped>
.chat-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
    Arial, sans-serif;
  overflow: hidden;
  background: var(--bg);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
  position: relative;
  z-index: 200;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.chat-container {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.sidebar-overlay {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 90;
  cursor: pointer;
  animation: fadeIn 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .chat-header {
    padding: 10px 16px;
  }

  .chat-container {
    padding-left: 56px;
  }

  .header-left {
    min-width: auto;
  }
}
</style>
