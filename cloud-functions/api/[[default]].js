import express from "express";
import fs from "fs";
import path from "path";
import { VectorSearcher } from "./vector-search.js";

/**
 * RAG Bot API - EdgeOne 云函数版本
 * 
 * 注意：这是演示版本，使用预计算的向量进行检索
 * 生产环境建议使用腾讯云 VectorDB 实现真正的向量检索
 */

const app = express();
const docsDir = path.resolve("./docs");

// 初始化向量检索器（懒加载）
let vectorSearcher = null;
let vectorSearcherInitializing = false;

// 中间件
app.use(express.json({ limit: "50mb" }));

// 所有请求的日志中间件
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url}`);
  next();
});

// 初始化向量检索器（懒加载）
async function initVectorSearcher() {
  if (vectorSearcher || vectorSearcherInitializing) {
    return;
  }
  
  vectorSearcherInitializing = true;
  
  try {
    // 尝试从多个位置加载向量数据
    const possiblePaths = [
      path.resolve('./backend/data/vector-store.json'),
      path.resolve('../backend/data/vector-store.json'),
      path.resolve('../../backend/data/vector-store.json'),
    ];
    
    let vectorDataPath = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        vectorDataPath = p;
        break;
      }
    }
    
    if (!vectorDataPath) {
      console.warn('[WARN] 未找到向量数据文件，将使用全文检索模式');
      vectorSearcherInitializing = false;
      return;
    }
    
    console.log(`[INFO] 正在加载向量数据: ${vectorDataPath}`);
    const vectorData = JSON.parse(fs.readFileSync(vectorDataPath, 'utf-8'));
    
    vectorSearcher = new VectorSearcher();
    vectorSearcher.initialize(vectorData);
    
    console.log(`[INFO] 向量检索器初始化成功: ${vectorSearcher.getStats().totalVectors} 个文本块`);
  } catch (error) {
    console.error('[ERROR] 初始化向量检索器失败:', error.message);
    vectorSearcher = null;
  } finally {
    vectorSearcherInitializing = false;
  }
}

// GET /documents - 获取文档列表
app.get("/documents", (req, res) => {
  try {
    let documents = [];
    const uploadedDocsMap = new Map(); // 用于合并上传的文档

    // 1. 从向量检索器获取动态上传的文档
    if (vectorSearcher && vectorSearcher.initialized) {
      const stats = vectorSearcher.getStats();
      console.log(`[INFO] 当前向量库状态: ${stats.totalVectors} 个文本块`);
      
      // 提取所有上传文档的名称和文本块数
      vectorSearcher.vectors.forEach(vector => {
        const source = vector.metadata?.source;
        if (source) {
          if (!uploadedDocsMap.has(source)) {
            uploadedDocsMap.set(source, { name: source, chunks: 0, size: 0, isUploaded: true });
          }
          uploadedDocsMap.get(source).chunks += 1;
        }
      });
      
      console.log(`[INFO] 已上传文档: ${Array.from(uploadedDocsMap.keys()).join(', ')}`);
    }

    // 2. 从文件系统获取预置文档
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);
      
      const docFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".md", ".txt", ".pdf", ".docx"].includes(ext);
      });

      documents = docFiles.map((file) => {
        const filePath = path.join(docsDir, file);
        const stats = fs.statSync(filePath);
        
        let content = "";
        try {
          content = fs.readFileSync(filePath, "utf-8");
        } catch (e) {
          // 二进制文件无法读取为文本
        }
        
        const chunks = content ? Math.ceil(content.length / 500) : 0;
        
        return { 
          name: file, 
          chunks, 
          size: stats.size,
          isUploaded: false // 标记为预置文档
        };
      });
    }

    // 3. 合并上传的文档（如果不在预置列表中）
    uploadedDocsMap.forEach((docInfo, fileName) => {
      // 检查是否已经存在于预置文档中
      const exists = documents.some(d => d.name === fileName);
      if (!exists) {
        // 估算大小（每字符约1字节）
        const estimatedSize = docInfo.chunks * 800;
        documents.push({
          name: docInfo.name,
          chunks: docInfo.chunks,
          size: estimatedSize,
          isUploaded: true
        });
      }
    });

    console.log(`[INFO] 返回文档列表: ${documents.length} 个文档`);
    res.json({ success: true, documents });
  } catch (error) {
    console.error("[ERROR] 获取文档失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /documents - 上传文档（支持 FormData 和 JSON）
app.post("/documents", async (req, res) => {
  try {
    let fileName, content;

    // 判断请求类型
    const contentType = req.headers['content-type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // FormData 格式（前端默认）
      // 注意：EdgeOne 云函数可能不支持 multer，需要手动解析
      // 这里我们要求前端使用 JSON 格式
      return res.status(400).json({
        success: false,
        error: "请使用 JSON 格式上传，Content-Type: application/json",
        hint: "发送 { fileName: 'xxx.txt', content: '文档内容' }"
      });
    } else {
      // JSON 格式
      const { fileName: reqFileName, content: reqContent } = req.body;
      fileName = reqFileName;
      content = reqContent;
    }
    
    if (!fileName || !content) {
      return res.status(400).json({ 
        success: false, 
        error: "缺少文件名或内容" 
      });
    }

    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: "未配置 API Key" 
      });
    }

    console.log(`[INFO] 开始处理上传文档: ${fileName}`);

    // 1. 简单的文本分块（每800字符一块，重叠200字符）
    const chunks = [];
    const chunkSize = 800;
    const overlap = 200;
    
    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunk = content.substring(i, i + chunkSize);
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    console.log(`[INFO] 文档分块完成: ${chunks.length} 个文本块`);

    // 2. 批量向量化
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const embeddingResponse = await fetch(
          "https://open.bigmodel.cn/api/paas/v4/embeddings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "embedding-2",
              input: chunks[i],
            }),
          }
        );

        const embeddingData = await embeddingResponse.json();
        
        if (embeddingData.data && embeddingData.data[0]) {
          vectors.push({
            content: chunks[i],
            embedding: embeddingData.data[0].embedding,
            metadata: {
              source: fileName,
              chunkIndex: i,
            },
          });
          
          console.log(`[INFO] 已向量化第 ${i + 1}/${chunks.length} 个文本块`);
        }

        // 避免 API 限流，每次请求间隔 100ms
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`[ERROR] 向量化第 ${i} 个文本块失败:`, error.message);
      }
    }

    // 3. 添加到向量检索器
    if (vectors.length > 0) {
      if (!vectorSearcher) {
        vectorSearcher = new VectorSearcher();
        vectorSearcher.initialize([]);
      }
      
      // 将新向量添加到现有向量库
      vectors.forEach((vector, index) => {
        vectorSearcher.vectors.push({
          id: vectorSearcher.vectors.length,
          ...vector,
        });
      });
      
      vectorSearcher.initialized = true;
      
      console.log(`[INFO] 文档上传成功: ${fileName}, 共 ${vectors.length} 个文本块`);
      
      res.json({
        success: true,
        message: `文档上传成功`,
        fileName,
        chunkCount: vectors.length,
        totalVectors: vectorSearcher.getStats().totalVectors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "向量化失败，未生成任何向量",
      });
    }
  } catch (error) {
    console.error("[ERROR] 上传文档失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /documents/:name - 删除文档（仅删除内存中的向量）
app.delete("/documents/:name", (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.name);
    
    if (!vectorSearcher || !vectorSearcher.initialized) {
      return res.status(404).json({
        success: false,
        error: "向量检索器未初始化",
      });
    }

    // 过滤掉该文档的所有向量
    const beforeCount = vectorSearcher.vectors.length;
    vectorSearcher.vectors = vectorSearcher.vectors.filter(
      (v) => v.metadata?.source !== fileName
    );
    const afterCount = vectorSearcher.vectors.length;
    const removedCount = beforeCount - afterCount;

    console.log(
      `[INFO] 已删除文档: ${fileName}, 移除 ${removedCount} 个文本块`
    );

    res.json({
      success: true,
      message: `已删除文档: ${fileName}`,
      removedChunks: removedCount,
      remainingVectors: afterCount,
    });
  } catch (error) {
    console.error("[ERROR] 删除文档失败:", error);
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

    // 初始化向量检索器（如果尚未初始化）
    await initVectorSearcher();

    let relevantDocs = [];
    const usedDocuments = [];

    // 尝试使用向量检索
    if (vectorSearcher) {
      try {
        // 1. 将问题转换为向量
        const embeddingResponse = await fetch("https://open.bigmodel.cn/api/paas/v4/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "embedding-2",
            input: question,
          }),
        });

        const embeddingData = await embeddingResponse.json();
        const queryEmbedding = embeddingData.data[0].embedding;

        // 2. 向量检索
        relevantDocs = vectorSearcher.search(queryEmbedding, 5, 0.25);
        
        console.log(`[INFO] 向量检索找到 ${relevantDocs.length} 个相关文本块`);
        
        // 提取文档名称（去重）
        const docNamesSet = new Set();
        relevantDocs.forEach(doc => {
          if (doc.metadata && doc.metadata.source) {
            docNamesSet.add(doc.metadata.source);
          }
        });
        usedDocuments.push(...Array.from(docNamesSet));
      } catch (error) {
        console.error('[ERROR] 向量检索失败，降级为全文检索:', error.message);
        // 降级为全文检索
      }
    }

    // 如果没有找到相关文档，使用全文检索作为后备
    if (relevantDocs.length === 0) {
      console.log('[WARN] 使用全文检索模式');
      if (fs.existsSync(docsDir)) {
        const files = fs.readdirSync(docsDir).filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return [".md", ".txt"].includes(ext);
        });

        for (const file of files) {
          try {
            const filePath = path.join(docsDir, file);
            const content = fs.readFileSync(filePath, "utf-8");
            relevantDocs.push({
              content: content.substring(0, 2000), // 限制长度
              metadata: { source: file }
            });
            usedDocuments.push(file);
          } catch (e) {
            console.error(`[ERROR] 读取文件失败: ${file}`, e.message);
          }
        }
      }
    }

    // 发送来源信息（使用真实的相似度分数）
    if (relevantDocs.length > 0) {
      const sourceMsg = {
        type: "sources",
        sources: relevantDocs.map((doc, index) => ({ 
          name: doc.metadata?.source || `文档片段${index + 1}`,
          score: parseFloat(doc.similarity.toFixed(4)) // 真实的相似度分数
        }))
      };
      res.write(`data: ${JSON.stringify(sourceMsg)}\n\n`);
    }

    // 构建系统提示（使用实际检索到的文档）
    const docNames = usedDocuments.length > 0 
      ? usedDocuments.join("、") 
      : "无可用文档";
      
    const documentContext = relevantDocs
      .map((doc, idx) => `【参考文档${idx + 1}】\n${doc.content.substring(0, 1500)}`)
      .join('\n\n');
      
    const systemPrompt = `你是一个专业的RAG智能问答助手。请严格基于以下参考文档内容回答用户的问题。

参考文档：
${documentContext || "（暂无可用文档）"}

本次回答参考的文档：${docNames}

回答要求：
1. 必须基于上述文档内容回答，不要编造文档中没有的信息
2. 如果文档中没有相关信息，请明确说明“参考文档中未找到相关信息”
3. 回答要简洁、准确、有条理，适当使用列表形式
4. 在回答中自然地引用相关文档的内容
5. 使用中文回答`;

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

export default app;
