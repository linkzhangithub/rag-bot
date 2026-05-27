const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const documentService = require('../services/document.service');
const vectorStore = require('../services/vector-store.service');

const router = express.Router();

// 上传接口限流：每分钟5次
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, error: '上传频率过高，请稍后再试' },
  standardHeaders: true,
});

// 应用限流到 POST 路由
router.post('/', uploadLimiter);

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 限制文件大小为 50MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    
    // 检查 PDF 支持
    if (ext === '.pdf') {
      try {
        require('pdf-parse');
      } catch (e) {
        return cb(new Error('PDF 解析库未安装，请先运行: npm install pdf-parse'));
      }
    }
    
    if (ext === '.md' || ext === '.txt' || ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('只支持 .md、.txt 和 .pdf 文件'));
    }
  },
});

/**
 * GET /api/documents - 获取文档列表
 */
router.get('/', (req, res) => {
  try {
    const docsDir = path.resolve(__dirname, '../../docs');
    let documents = [];

    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ['.md', '.txt', '.pdf', '.docx'].includes(ext);
      });
      documents = files.map((file) => {
        const filePath = path.join(docsDir, file);
        const stats = fs.statSync(filePath);
        let content = '';
        try { content = fs.readFileSync(filePath, 'utf-8'); } catch (_) {}
        return { name: file, chunks: content ? Math.ceil(content.length / 500) : 0, size: stats.size };
      });
    }

    res.json({ success: true, documents });
  } catch (error) {
    console.error('获取文档列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents - 上传文档
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择要上传的文件' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    const chunkCount = await documentService.processDocument(filePath, fileName);

    // 删除临时文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: `文件上传成功，共 ${chunkCount} 个文本块`,
      fileName,
      chunkCount,
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:name - 删除文档
 */
router.delete('/:name', (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.name);
    const removedCount = vectorStore.removeBySource(fileName);

    if (removedCount > 0) {
      res.json({ success: true, message: `已删除 ${removedCount} 个文本块` });
    } else {
      res.status(404).json({ success: false, error: '未找到该文档' });
    }
  } catch (error) {
    console.error('删除文档失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
