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
        :loading="loading"
        :uploading="uploading"
        :upload-progress="uploadProgress"
        @delete-document="handleDeleteDocument"
        @upload="handleUploadFile"
        @upload-error="handleUploadError"
        @toggle="handleSidebarToggle"
        @refresh="handleRefreshDocuments"
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
import Logo from "@/components/Logo.vue";
import AppButton from "@/components/AppButton.vue";
import AppNotification from "@/components/AppNotification.vue";
import Sidebar from "@/components/Sidebar.vue";
import ChatArea from "@/components/ChatArea.vue";
import { useChatStream } from "@/composables/useChatStream";
import { useDocument } from "@/composables/useDocument";
import { useNotification } from "@/composables/useNotification";
import "@/assets/styles/chat.css";

const router = useRouter();
const {
  messages,
  isGenerating,
  sendMessage: sendChatMessage,
} = useChatStream();
const { documents, uploading, uploadProgress, loading, handleUpload, handleDelete, loadDocuments } = useDocument();
const { notification, success, error, close } = useNotification();

const sidebarOpen = ref(false);
const isMobile = ref(false);
const sidebarCollapsed = ref(true);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
  // 根据设备类型设置侧边栏初始状态
  if (isMobile.value) {
    sidebarCollapsed.value = true;
    sidebarOpen.value = false;
  } else {
    sidebarCollapsed.value = false;
    sidebarOpen.value = true;
  }
};

const goHome = () => router.push("/");

const handleSidebarToggle = (isOpen) => {
  sidebarOpen.value = isOpen;
  sidebarCollapsed.value = !isOpen;
};

const closeSidebar = () => {
  sidebarOpen.value = false;
  sidebarCollapsed.value = true;
};

const sendMessage = (content) => sendChatMessage(content);

const handleDeleteDocument = async (name) => {
  try {
    await handleDelete(name);
    success(`文档 "${name}" 删除成功`);
  } catch (err) {
    error("删除失败: " + err.message);
  }
};

const handleUploadFile = async (file) => {
  try {
    await handleUpload(file);
    success(`文档 "${file.name}" 上传成功`);
  } catch (err) {
    error("上传失败: " + err.message);
  }
};

const handleUploadError = (message) => {
  error("上传失败: " + message);
};

const handleRefreshDocuments = async () => {
  try {
    await loadDocuments();
    success("文档刷新成功");
  } catch (err) {
    error("刷新失败: " + err.message);
  }
};

const closeNotification = () => close();

onMounted(() => {
  loadDocuments();
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>
