const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const iconv = require("iconv-lite");
const documentService = require("../services/document.service");
const vectorStore = require("../services/vector-store.service");

const router = express.Router();

/**
 * 检测并转换文件名编码
 * 支持 UTF-8、GBK、GB2312、GB18030、ISO-8859-1 等编码
 * @param {string} fileName - 原始文件名
 * @returns {string} 转换后的 UTF-8 文件名
 */
function detectAndConvertEncoding(fileName) {
  if (!fileName) return fileName;

  // 支持的编码列表，按优先级排序
  const encodings = ["utf8", "GB18030", "GBK", "GB2312", "latin1"];

  // 先检查是否已经是有效的 UTF-8
  if (isValidUTF8(fileName)) {
    console.log("[DEBUG] 文件名为有效 UTF-8 编码");
    return fileName;
  }

  // 尝试各种编码转换
  for (const encoding of encodings) {
    try {
      // 将字符串视为特定编码的字节序列，然后转换为 UTF-8
      const buffer = Buffer.from(fileName, "latin1");
      const converted = iconv.decode(buffer, encoding);

      // 验证转换结果是否包含有效中文字符
      if (converted !== fileName && /[\u4e00-\u9fa5]/.test(converted)) {
        console.log(`[DEBUG] 通过 ${encoding} 编码成功转换文件名`);
        return converted;
      }
    } catch (e) {
      console.log(`[DEBUG] 尝试 ${encoding} 编码转换失败: ${e.message}`);
    }
  }

  // 尝试 UTF-8 被错误解码为 Latin-1 的情况
  try {
    const decoded = Buffer.from(fileName, "latin1").toString("utf8");
    if (
      decoded !== fileName &&
      isValidUTF8(decoded) &&
      /[\u4e00-\u9fa5]/.test(decoded)
    ) {
      console.log("[DEBUG] 通过 Latin-1 -> UTF-8 转换成功");
      return decoded;
    }
  } catch (e) {
    console.log(`[DEBUG] Latin-1 -> UTF-8 转换失败: ${e.message}`);
  }

  // 如果所有尝试都失败，返回原始文件名
  console.log("[DEBUG] 无法检测到有效编码，使用原始文件名");
  return fileName;
}

/**
 * 检查字符串是否为有效的 UTF-8
 * @param {string} str - 待检查的字符串
 * @returns {boolean} 是否为有效的 UTF-8
 */
function isValidUTF8(str) {
  try {
    // 通过编码解码验证
    const encoded = Buffer.from(str, "utf8");
    const decoded = encoded.toString("utf8");
    return str === decoded;
  } catch {
    return false;
  }
}

// 上传接口限流：每分钟5次
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: "上传频率过高，请稍后再试" },
  standardHeaders: true,
});

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 处理中文文件名编码问题
    let fileName = file.originalname;
    console.log(`[DEBUG] 原始文件名: ${fileName}`);

    // 增强的编码检测和转换逻辑
    try {
      fileName = detectAndConvertEncoding(fileName);
      console.log(`[DEBUG] 修复后文件名: ${fileName}`);
    } catch (e) {
      console.log(`[DEBUG] 文件名编码修复失败: ${e.message}`);
    }

    // 安全检查：确保文件名不包含路径分隔符和特殊字符
    fileName = fileName.replace(/[\\/:*?"<>|]/g, "_");
    if (!fileName) {
      fileName = `upload_${Date.now()}.tmp`;
    }

    cb(null, fileName);
  },
});

// 预先检查依赖是否安装
let hasPdfParse = false;
let hasMammoth = false;
try {
  require("pdf-parse");
  hasPdfParse = true;
} catch (e) {
  console.log("[WARN] pdf-parse 未安装，PDF 文件上传将被拒绝");
}
try {
  require("mammoth");
  hasMammoth = true;
} catch (e) {
  console.log("[WARN] mammoth 未安装，DOCX 文件上传将被拒绝");
}

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 限制文件大小为 50MB
  },
  fileFilter: (req, file, cb) => {
    // 处理中文文件名编码问题 - 关键修复
    let originalName = file.originalname;
    try {
      // 处理 UTF-8 编码的文件名被错误解析为 Latin-1 的情况
      const buffer = Buffer.from(originalName, "latin1");
      const decodedName = buffer.toString("utf8");
      // 如果解码后包含中文字符，使用解码后的名称
      if (/[\u4e00-\u9fa5]/.test(decodedName)) {
        file.originalname = decodedName;
        console.log(
          `[DEBUG] 文件名编码修复: ${originalName} -> ${decodedName}`,
        );
      }
    } catch (e) {
      console.log(`[DEBUG] 文件名编码修复失败: ${e.message}`);
    }

    const ext = path.extname(file.originalname).toLowerCase();

    // 检查 PDF 支持
    if (ext === ".pdf" && !hasPdfParse) {
      return cb(new Error("PDF 解析库未安装"));
    }

    // 检查 DOCX 支持
    if (ext === ".docx" && !hasMammoth) {
      return cb(new Error("DOCX 解析库未安装"));
    }

    if (ext === ".md" || ext === ".txt" || ext === ".pdf" || ext === ".docx") {
      cb(null, true);
    } else {
      cb(new Error("只支持 .md、.txt、.pdf 和 .docx 文件"));
    }
  },
});

/**
 * GET /api/documents - 获取文档列表
 */
router.get("/", (req, res) => {
  try {
    console.log("[DEBUG] 获取文档列表请求");
    const documents = vectorStore.getDocumentList();
    console.log(`[DEBUG] 文档列表: ${JSON.stringify(documents)}`);
    res.json({ success: true, documents });
  } catch (error) {
    console.error("[ERROR] 获取文档列表失败:", error);
    console.error("[ERROR] 错误堆栈:", error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents - 上传文档
 */
router.post("/", uploadLimiter, upload.single("file"), async (req, res) => {
  try {
    console.log("[DEBUG] 收到文件上传请求");

    if (!req.file) {
      console.log("[DEBUG] 没有文件被上传");
      return res
        .status(400)
        .json({ success: false, error: "请选择要上传的文件" });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileSize = req.file.size;

    console.log(`[DEBUG] 文件路径: ${filePath}`);
    console.log(`[DEBUG] 文件名称: ${fileName}`);
    console.log(`[DEBUG] 文件大小: ${fileSize} 字节`);

    // 把文件复制到 docs 目录，这样重启服务后也能加载到
    const docsDir = path.resolve(__dirname, "../../docs");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    const destPath = path.join(docsDir, fileName);
    fs.copyFileSync(filePath, destPath);

    const chunkCount = await documentService.processDocument(
      filePath,
      fileName,
      fileSize,
    );
    console.log(`[DEBUG] 文档处理完成，共 ${chunkCount} 个文本块`);

    // 删除临时文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `文件上传成功，共 ${chunkCount} 个文本块`,
      fileName,
      chunkCount,
      fileSize,
    });
  } catch (error) {
    console.error("[ERROR] 上传文件失败:", error);
    console.error("[ERROR] 错误堆栈:", error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:name - 删除文档
 */
router.delete("/:name", (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.name);

    // 路径遍历防护：过滤路径遍历字符
    if (
      fileName.includes("..") ||
      fileName.includes("/") ||
      fileName.includes("\\")
    ) {
      return res
        .status(400)
        .json({ success: false, error: "文件名包含非法字符" });
    }

    const removedCount = vectorStore.removeBySource(fileName);

    // 同时删除 docs 目录里的文件
    const docsDir = path.resolve(__dirname, "../../docs");
    const filePath = path.join(docsDir, fileName);

    // 额外验证：确保路径在 docs 目录内
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(docsDir))) {
      return res.status(400).json({ success: false, error: "非法路径" });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (removedCount > 0) {
      res.json({ success: true, message: `已删除 ${removedCount} 个文本块` });
    } else {
      res.status(404).json({ success: false, error: "未找到该文档" });
    }
  } catch (error) {
    console.error("删除文档失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/refresh - 刷新知识库（重新加载docs目录）
 */
router.post("/refresh", async (req, res) => {
  try {
    await documentService.reinitializeKnowledgeBase();
    const documents = vectorStore.getDocumentList();
    res.json({
      success: true,
      documents,
      message: "知识库刷新成功",
    });
  } catch (error) {
    console.error("[ERROR] 刷新知识库失败:", error);
    console.error("[ERROR] 错误堆栈:", error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/content/:name - 获取文档内容
 */
router.get("/content/:name", async (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.name);

    // 路径遍历防护：过滤路径遍历字符
    if (
      fileName.includes("..") ||
      fileName.includes("/") ||
      fileName.includes("\\")
    ) {
      return res
        .status(400)
        .json({ success: false, error: "文件名包含非法字符" });
    }

    const docsDir = path.resolve(__dirname, "../../docs");
    const filePath = path.join(docsDir, fileName);

    // 额外验证：确保路径在 docs 目录内
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(docsDir))) {
      return res.status(400).json({ success: false, error: "非法路径" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "文档不存在" });
    }

    const ext = path.extname(fileName).toLowerCase();
    let content = "";
    let mimeType = "text/plain";

    // 根据文件类型解析内容
    if (ext === ".pdf") {
      // PDF文件返回文件路径，前端使用iframe渲染
      return res.json({
        success: true,
        type: "pdf",
        fileName: fileName,
        filePath: `/docs/${encodeURIComponent(fileName)}`,
        message: "PDF文件使用iframe渲染",
      });
    } else if (ext === ".docx") {
      // DOCX文件使用textract解析
      try {
        content = await documentService.extractTextWithTextract(filePath);
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      } catch (err) {
        console.error("[ERROR] 解析DOCX失败:", err);
        return res.status(500).json({ success: false, error: "文档解析失败" });
      }
    } else {
      // TXT/MD文件直接读取
      content = fs.readFileSync(filePath, "utf8");
      mimeType = ext === ".md" ? "text/markdown" : "text/plain";
    }

    res.json({
      success: true,
      type: "text",
      fileName: fileName,
      content: content,
      mimeType: mimeType,
      size: fs.statSync(filePath).size,
    });
  } catch (error) {
    console.error("[ERROR] 获取文档内容失败:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
