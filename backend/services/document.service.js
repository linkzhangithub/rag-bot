const fs = require('fs');
const path = require('path');
const chunkerService = require('./chunker.service');
const embeddingService = require('./embedding.service');
const vectorStore = require('./vector-store.service');

// PDF解析库（可选）
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.log('pdf-parse 未安装，PDF支持不可用');
}

// DOCX解析库（可选）
let mammoth;
try {
  mammoth = require('mammoth');
} catch (e) {
  console.log('mammoth 未安装，DOCX支持不可用');
}

/**
 * 文档处理服务
 * 负责文档加载、分块、嵌入和存储
 */
class DocumentService {
  /**
   * 解析PDF文件
   * @param {Buffer} buffer - PDF文件缓冲区
   * @returns {Promise<string>} 提取的文本内容
   */
  async parsePDF(buffer) {
    if (!pdfParse) {
      throw new Error('PDF解析库未安装，请先运行: npm install pdf-parse');
    }
    const data = await pdfParse(buffer);
    return data.text;
  }

  /**
   * 解析DOCX文件
   * @param {Buffer} buffer - DOCX文件缓冲区
   * @returns {Promise<string>} 提取的文本内容
   */
  async parseDOCX(buffer) {
    if (!mammoth) {
      throw new Error('DOCX解析库未安装，请先运行: npm install mammoth');
    }
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  /**
   * 根据文件扩展名解析文档
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} 文档内容
   */
  async parseDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      return await this.parsePDF(buffer);
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath);
      return await this.parseDOCX(buffer);
    } else {
      // 默认按文本文件处理（.md, .txt等）
      return fs.readFileSync(filePath, 'utf8');
    }
  }
  /**
   * 加载并处理文档
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名
   * @param {number} fileSize - 文件大小（字节）
   * @returns {Promise<number>} 处理的文本块数量
   */
  async processDocument(filePath, fileName, fileSize = 0) {
    // 根据文件类型解析文档
    const content = await this.parseDocument(filePath);
    const chunks = chunkerService.splitText(content);

    const docs = [];

    for (const chunk of chunks) {
      const embedding = await embeddingService.getEmbedding(chunk);
      docs.push({
        content: chunk,
        embedding,
        metadata: { source: fileName, size: fileSize },
      });
    }

    // 批量添加到向量存储
    vectorStore.addMany(docs);

    return docs.length;
  }

  /**
   * 从 docs 目录初始化知识库
   * @returns {Promise<void>}
   */
  async initializeKnowledgeBase() {
    const docsDir = path.resolve(__dirname, '../../docs');

    if (!fs.existsSync(docsDir)) {
      console.log('docs 目录不存在，跳过初始化');
      return;
    }

    const files = fs.readdirSync(docsDir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.md' || ext === '.txt' || ext === '.pdf' || ext === '.docx';
    });

    console.log(`找到 ${files.length} 个文档文件`);

    // 清空现有数据，避免重复加载
    vectorStore.clear();

    for (const file of files) {
      const filePath = `${docsDir}/${file}`;
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const chunkCount = await this.processDocument(filePath, file, fileSize);
      console.log(`加载文档：${file}，分割为 ${chunkCount} 个文本块`);
    }

    console.log(`知识库初始化完成，共 ${vectorStore.size()} 个文本块`);
  }

  /**
   * 重新初始化知识库（清空并重新加载所有文档）
   * @returns {Promise<void>}
   */
  async reinitializeKnowledgeBase() {
    const docsDir = path.resolve(__dirname, '../../docs');

    if (!fs.existsSync(docsDir)) {
      console.log('docs 目录不存在');
      return;
    }

    const files = fs.readdirSync(docsDir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.md' || ext === '.txt' || ext === '.pdf' || ext === '.docx';
    });

    console.log(`找到 ${files.length} 个文档文件`);

    vectorStore.clear();

    for (const file of files) {
      const filePath = `${docsDir}/${file}`;
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const chunkCount = await this.processDocument(filePath, file, fileSize);
      console.log(`重新加载文档：${file}，分割为 ${chunkCount} 个文本块`);
    }

    console.log(`知识库重新初始化完成，共 ${vectorStore.size()} 个文本块`);
  }
}

module.exports = new DocumentService();
