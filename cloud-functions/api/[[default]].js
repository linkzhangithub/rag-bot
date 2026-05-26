import express from "express";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 导入后端路由
import documentRoutes from "../../backend/routes/document.routes.js";
import chatRoutes from "../../backend/routes/chat.routes.js";

// API 路由
app.use("/documents", documentRoutes);
app.use("/chat", chatRoutes);

// 健康检查
app.get("/health", (req, res) => {
  res.json({ success: true, message: "RAG Bot API is running" });
});

export default app;