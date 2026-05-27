/**
 * 简单的向量检索工具
 * 用于云函数环境中的向量相似度计算
 */

/**
 * 计算两个向量的余弦相似度
 * @param {number[]} vecA - 向量 A
 * @param {number[]} vecB - 向量 B
 * @returns {number} 相似度 (0-1)
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 向量检索类
 */
class VectorSearcher {
  constructor() {
    this.vectors = []; // 存储所有文档向量（公开属性，允许外部修改）
    this.initialized = false;
  }

  /**
   * 初始化向量库
   * @param {Array} vectorData - 从 vector-store.json 加载的数据
   */
  initialize(vectorData) {
    this.vectors = vectorData.map((item, index) => ({
      id: index,
      content: item.content,
      embedding: item.embedding,
      metadata: item.metadata || {},
    }));
    this.initialized = true;
    console.log(`[VectorSearcher] 已加载 ${this.vectors.length} 个文本块`);
  }

  /**
   * 搜索最相关的文本块
   * @param {number[]} queryEmbedding - 查询向量
   * @param {number} topK - 返回前 K 个结果
   * @param {number} threshold - 相似度阈值
   * @returns {Array} 搜索结果
   */
  search(queryEmbedding, topK = 5, threshold = 0.25) {
    if (!this.initialized) {
      throw new Error('VectorSearcher 未初始化');
    }

    // 计算所有文档的相似度
    const results = this.vectors.map((doc) => ({
      ...doc,
      similarity: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    // 过滤低于阈值的结果
    const filtered = results.filter((r) => r.similarity >= threshold);

    // 按相似度降序排序
    const sorted = filtered.sort((a, b) => b.similarity - a.similarity);

    // 返回 Top-K
    return sorted.slice(0, topK);
  }

  /**
   * 获取向量库统计信息
   */
  getStats() {
    return {
      totalVectors: this.vectors.length,
      initialized: this.initialized,
    };
  }
}

module.exports = { VectorSearcher, cosineSimilarity };
