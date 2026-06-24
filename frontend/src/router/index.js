import { createRouter, createWebHashHistory } from "vue-router";
import Home from "../views/Home.vue";
import Chat from "../views/Chat.vue";
import DocumentPreview from "../views/DocumentPreview.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "Home",
      component: Home,
    },
    {
      path: "/chat",
      name: "Chat",
      component: Chat,
    },
    {
      path: "/preview",
      name: "DocumentPreview",
      component: DocumentPreview,
    },
  ],
});

export default router;
