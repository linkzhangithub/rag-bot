import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

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
