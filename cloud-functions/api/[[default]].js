import express from "express";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 导入文档服务并初始化知识库
import documentService from "../../backend/services/document.service.js";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await documentService.initializeKnowledgeBase();
    initialized = true;
  }
}

// 初始化中间件 - 确保知识库在使用前已加载
app.use(async (req, res, next) => {
  await ensureInitialized();
  next();
});

// 导入后端路由
import documentRoutes from "../../backend/routes/document.routes.js";
import chatRoutes from "../../backend/routes/chat.routes.js";

// API 路由 - 使用 /api 前缀与前端 baseURL 匹配
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "RAG Bot API is running" });
});

export default app;
