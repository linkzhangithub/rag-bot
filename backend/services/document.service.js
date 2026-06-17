const fs = require('fs');
const path = require('path');
const chunkerService = require('./chunker.service');
const embeddingService = require('./embedding.service');
const vectorStore = require('./vector-store.service');

let textract;
try {
  textract = require('textract');
  console.log('textract 加载成功，支持 PDF、DOCX、TXT、MD 等格式');
} catch (e) {
  console.log('textract 未安装，将使用基础文本读取方式');
  textract = null;
}

let pdfParse;
try {
  pdfParse = require('pdf-parse');
  console.log('pdf-parse 加载成功，支持 PDF 解析');
} catch (e) {
  console.log('pdf-parse 未安装');
  pdfParse = null;
}

class DocumentService {
  async extractTextWithTextract(filePath) {
    return new Promise((resolve, reject) => {
      textract.fromFileWithPath(filePath, (error, text) => {
        if (error) {
          reject(error);
        } else {
          resolve(text || '');
        }
      });
    });
  }

  async parseDocument(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf' && pdfParse) {
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        const text = data.text || '';
        console.log(`[DEBUG] ${filePath} 解析成功(pdf-parse)，内容长度: ${text.length}`);
        if (text.length > 0) {
          console.log(`[DEBUG] 前200字符: ${text.substring(0, 200)}...`);
        }
        return text;
      } catch (error) {
        console.warn(`pdf-parse 解析失败 (${filePath}): ${error.message}`);
      }
    }
    
    if (textract && (ext === '.pdf' || ext === '.docx')) {
      try {
        const text = await this.extractTextWithTextract(filePath);
        console.log(`[DEBUG] ${filePath} 解析成功(textract)，内容长度: ${text.length}`);
        if (text.length > 0) {
          console.log(`[DEBUG] 前200字符: ${text.substring(0, 200)}...`);
        }
        return text;
      } catch (error) {
        console.warn(`textract 解析失败 (${filePath}): ${error.message}，尝试基础方式`);
      }
    }
    
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.warn(`无法读取文件: ${filePath}`);
      return '';
    }
  }

  async processDocument(filePath, fileName, fileSize = 0) {
    const content = await this.parseDocument(filePath);
    
    if (!content || content.trim().length === 0) {
      console.warn(`文档内容为空: ${fileName}`);
      return 0;
    }
    
    const chunks = chunkerService.splitText(content);
    const docs = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      try {
        const embedding = await embeddingService.getEmbedding(chunks[i]);
        docs.push({
          content: chunks[i],
          embedding,
          metadata: { source: fileName, size: fileSize },
        });
        successCount++;
      } catch (error) {
        failCount++;
        console.warn(`[WARN] ${fileName} 文本块 ${i+1} 向量化失败: ${error.message}`);
      }
    }

    if (docs.length > 0) {
      vectorStore.addMany(docs);
    }
    
    return successCount;
  }

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
    vectorStore.clear();

    for (const file of files) {
      const filePath = `${docsDir}/${file}`;
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      
      try {
        const chunkCount = await this.processDocument(filePath, file, fileSize);
        console.log(`加载文档：${file}，分割为 ${chunkCount} 个文本块`);
      } catch (error) {
        console.error(`加载文档失败 ${file}: ${error.message}`);
      }
    }

    console.log(`知识库初始化完成，共 ${vectorStore.size()} 个文本块`);
  }

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
      
      try {
        const chunkCount = await this.processDocument(filePath, file, fileSize);
        console.log(`重新加载文档：${file}，分割为 ${chunkCount} 个文本块`);
      } catch (error) {
        console.error(`重新加载文档失败 ${file}: ${error.message}`);
      }
    }

    console.log(`知识库重新初始化完成，共 ${vectorStore.size()} 个文本块`);
  }
}

module.exports = new DocumentService