const fs = require("fs");
const path = require("path");

/**
 * 向量存储（JSON 文件持久化）
 */
class VectorStore {
  constructor(filePath = "../data/vector-store.json") {
    this.filePath = path.resolve(__dirname, filePath);
    this.data = this.load();
  }

  /**
   * 从文件加载数据
   * @returns {Array} 向量数据数组
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, "utf8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.error("加载向量存储失败:", error.message);
    }
    return [];
  }

  /**
   * 保存数据到文件
   */
  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error("保存向量存储失败:", error.message);
    }
  }

  /**
   * 添加文档块
   * @param {object} doc - 文档块 { content, embedding, metadata }
   */
  add(doc) {
    this.data.push(doc);
    this.save();
  }

  /**
   * 批量添加文档块
   * @param {Array} docs - 文档块数组
   */
  addMany(docs) {
    this.data.push(...docs);
    this.save();
  }

  /**
   * 删除指定来源的所有文档块
   * @param {string} source - 文档来源（文件名）
   * @returns {number} 删除的数量
   */
  removeBySource(source) {
    const beforeCount = this.data.length;
    this.data = this.data.filter((doc) => doc.metadata.source !== source);
    const removedCount = beforeCount - this.data.length;
    if (removedCount > 0) {
      this.save();
    }
    return removedCount;
  }

  /**
   * 获取所有文档块
   * @returns {Array} 文档块数组
   */
  getAll() {
    return this.data;
  }

  /**
   * 获取文档列表（按来源分组）
   * @returns {Array} 文档列表 [{ name, chunks, size, isPreset }]
   */
  getDocumentList() {
    const docMap = new Map();
    const docsDir = path.resolve(__dirname, "../../docs");

    // 1. 先从 docs 目录读取预置文档
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);
      const docFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return [".md", ".txt", ".pdf", ".docx"].includes(ext);
      });

      docFiles.forEach((file) => {
        const filePath = path.join(docsDir, file);
        const stats = fs.statSync(filePath);
        docMap.set(file, {
          name: file,
          chunks: 0,
          size: stats.size,
          isPreset: true, // 标记为预置文档
        });
      });
    }

    // 2. 从向量数据中更新文本块数量
    for (const doc of this.data) {
      const name = doc.metadata.source;
      if (docMap.has(name)) {
        docMap.get(name).chunks++;
      } else {
        // 非预置文档（上传的文档）
        docMap.set(name, {
          name,
          chunks: 1,
          size: doc.metadata.size || 0,
          isPreset: false,
        });
      }
    }

    return Array.from(docMap.values());
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.data = [];
    this.save();
  }

  /**
   * 获取文档数量
   * @returns {number} 文档块总数
   */
  size() {
    return this.data.length;
  }
}

module.exports = new VectorStore();
