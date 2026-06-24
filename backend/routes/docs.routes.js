const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const docsDir = path.resolve(__dirname, '../../docs');

/**
 * GET /api/docs/:name - 提供原始文档文件（PDF 预览 iframe 使用）
 */
router.get('/:name', (req, res) => {
  try {
    const fileName = decodeURIComponent(req.params.name);

    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return res.status(400).json({ success: false, error: '文件名包含非法字符' });
    }

    const filePath = path.join(docsDir, fileName);
    const normalizedPath = path.normalize(filePath);

    if (!normalizedPath.startsWith(path.normalize(docsDir))) {
      return res.status(400).json({ success: false, error: '非法路径' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    const ext = path.extname(fileName).toLowerCase();

    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('[ERROR] 获取文档文件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
