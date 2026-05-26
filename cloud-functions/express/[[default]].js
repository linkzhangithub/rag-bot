import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const docsDir = path.resolve("./docs");

// 中间件
app.use(express.json({ limit: "50mb" }));

// 所有请求的日志中间件
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// GET /api/documents - 获取文档列表
app.get("/api/documents", (req, res) => {
  console.log("[DEBUG] 处理获取文档列表请求");
  
  try {
    let documents = [];
    
    console.log(`[DEBUG] docsDir: ${docsDir}`);
    console.log(`[DEBUG] exists: ${fs.existsSync(docsDir)}`);

    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);
      console.log(`[DEBUG] 目录中的所有文件: ${JSON.stringify(files)}`);
      
      const docFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".md", ".txt", ".pdf", ".docx"].includes(ext);
      });
      
      console.log(`[DEBUG] 过滤后的文档文件: ${JSON.stringify(docFiles)}`);

      documents = docFiles.map((file) => {
        const filePath = path.join(docsDir, file);
        const stats = fs.statSync(filePath);
        return { name: file, chunks: 0, size: stats.size };
      });
    }

    console.log(`[DEBUG] 返回文档列表: ${JSON.stringify(documents)}`);
    res.json({ success: true, documents });
  } catch (error) {
    console.error("[ERROR] 获取文档失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/chat/stream - AI对话（简化版）
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { question } = req.body;
    
    // 返回模拟响应
    const mockResponse = {
      type: "content",
      content: `抱歉，当前演示环境暂不支持完整的AI对话功能。\n\n您的问题是：${question}\n\n请在本地上传文档后使用完整功能。`
    };
    
    // 设置SSE响应头
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    
    // 发送数据
    res.write(`data: ${JSON.stringify(mockResponse)}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[ERROR] 聊天失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/health - 健康检查
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "RAG Bot API is running",
    debug: {
      docsDir,
      exists: fs.existsSync(docsDir),
      files: fs.existsSync(docsDir) ? fs.readdirSync(docsDir) : []
    }
  });
});

// 匹配所有未处理的路由
app.use((req, res) => {
  console.log(`[DEBUG] 未匹配的路由: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false, 
    error: "Not Found",
    path: req.url,
    method: req.method,
    available: ["/api/documents", "/api/health", "/api/chat/stream"]
  });
});

export default app;
