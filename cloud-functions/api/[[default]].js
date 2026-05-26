import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const docsDir = path.resolve("./docs");

// 中间件
app.use(express.json({ limit: "50mb" }));

// GET /api/documents - 获取文档列表
app.get("/api/documents", (req, res) => {
  try {
    let documents = [];

    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".md", ".txt", ".pdf", ".docx"].includes(ext);
      });

      documents = files.map((file) => {
        const filePath = path.join(docsDir, file);
        const stats = fs.statSync(filePath);
        return { name: file, chunks: 0, size: stats.size };
      });
    }

    res.json({ success: true, documents });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/health - 健康检查
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "RAG Bot API is running" });
});

export default app;
