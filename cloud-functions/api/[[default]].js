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

// GET /documents - 获取文档列表
app.get("/documents", (req, res) => {
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
        
        // 尝试读取文件内容并计算文本块数
        let content = "";
        try {
          content = fs.readFileSync(filePath, "utf-8");
        } catch (e) {
          // 二进制文件无法读取为文本
        }
        
        // 简单估算文本块数（每500字一块）
        const chunks = content ? Math.ceil(content.length / 500) : 0;
        
        return { name: file, chunks, size: stats.size };
      });
    }

    console.log(`[DEBUG] 返回文档列表: ${JSON.stringify(documents)}`);
    res.json({ success: true, documents });
  } catch (error) {
    console.error("[ERROR] 获取文档失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /chat/stream - AI对话（完整RAG功能）
app.post("/chat/stream", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ success: false, error: "缺少问题参数" });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // 获取API密钥
    const apiKey = process.env.ZHIPU_API_KEY;
    
    if (!apiKey) {
      const errorMsg = {
        type: "content",
        content: "错误：未配置 ZHIPU_API_KEY 环境变量。请在 EdgeOne 控制台配置环境变量。"
      };
      res.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // 读取所有文档内容作为上下文
    let documentContext = "";
    const usedDocuments = [];
    
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".md", ".txt"].includes(ext);
      });

      for (const file of files) {
        try {
          const filePath = path.join(docsDir, file);
          const content = fs.readFileSync(filePath, "utf-8");
          documentContext += `\n\n=== 文档: ${file} ===\n${content}`;
          usedDocuments.push(file);
        } catch (e) {
          console.error(`[ERROR] 读取文件失败: ${file}`, e.message);
        }
      }
    }

    // 发送来源信息
    if (usedDocuments.length > 0) {
      const sourceMsg = {
        type: "source",
        documents: usedDocuments.map(name => ({ name }))
      };
      res.write(`data: ${JSON.stringify(sourceMsg)}\n\n`);
    }

    // 构建系统提示
    const systemPrompt = `你是一个专业的RAG智能问答助手。请基于以下参考文档内容回答用户的问题。

参考文档内容：
${documentContext || "（暂无可用文档）"}

回答要求：
1. 基于提供的文档内容进行回答
2. 如果文档中没有相关信息，请明确说明
3. 回答要简洁、准确、有条理
4. 使用中文回答`;

    // 调用智谱 API（SSE 流式）
    const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ERROR] 智谱API错误:", errorText);
      const errorMsg = {
        type: "content",
        content: `错误：AI服务调用失败 (${response.status})。请稍后重试。`
      };
      res.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // 转发SSE流
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              const sseData = { type: "content", content };
              res.write(`data: ${JSON.stringify(sseData)}\n\n`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[ERROR] 聊天失败:", error);
    
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      const errorMsg = { type: "content", content: `错误：${error.message}` };
      res.write(`data: ${JSON.stringify(errorMsg)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// GET /health - 健康检查
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "RAG Bot API is running",
    debug: {
      docsDir,
      exists: fs.existsSync(docsDir),
      files: fs.existsSync(docsDir) ? fs.readdirSync(docsDir) : [],
      hasApiKey: !!process.env.ZHIPU_API_KEY
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
    available: ["/documents", "/health", "/chat/stream"]
  });
});

export default app;
