const { cosineSimilarity } = require("../utils/cosine");
const embeddingService = require("./embedding.service");
const vectorStore = require("./vector-store.service");
const keywordProcessor = require("../utils/keyword-processor");
const config = require("../config");

/**
 * 检索服务
 * 流程：问题 embedding → 余弦相似度 → 阈值过滤 → Top-K 排序
 * 新增：BM25关键词检索 + 混合检索（向量70% + 关键词30%）
 */
class RetrievalService {
  /**
   * 查询扩展：智能提取关键词，增强检索效果
   * @param {string} query - 原始查询
   * @returns {string} 扩展后的查询
   */
  expandQuery(query) {
    return keywordProcessor.expandQuery(query);
  }

  /**
   * 检索相关文档（混合检索：向量 + 关键词）
   * @param {string} query - 查询问题
   * @param {object} options - 配置选项
   * @returns {Promise<Array>} 相关文档数组
   */
  async retrieve(query, options = {}) {
    const { topK = config.topK, threshold = config.similarityThreshold } = options;

    const allDocs = vectorStore.getAll();

    if (allDocs.length === 0) {
      return [];
    }

    // 用核心关键词进行向量检索
    const coreKeywords = keywordProcessor.extractCoreKeywords(query);
    const queryEmbedding = await embeddingService.getEmbedding(coreKeywords || query);

    // 计算所有文档的向量相似度
    const similarities = allDocs.map((doc, index) => ({
      index,
      doc,
      vectorScore: cosineSimilarity(queryEmbedding, doc.embedding),
      keywordScore: keywordProcessor.calculateKeywordScore(query, doc.content),
    }));

    // 混合评分：向量70% + 关键词30%
    similarities.forEach((item) => {
      item.hybridScore = item.vectorScore * 0.7 + item.keywordScore * 0.3;
    });

    // 按混合分数降序排序
    similarities.sort((a, b) => b.hybridScore - a.hybridScore);

    // 先取Top-30候选
    const candidates = similarities.slice(0, 30);

    // Rerank：智能重排序
    const reranked = candidates.map((item) => {
      const coverageScore = keywordProcessor.calculateCoverageScore(query, item.doc.content);
      
      // 最终分数：混合分数70% + 覆盖度30%
      item.finalScore = item.hybridScore * 0.7 + coverageScore * 0.3;
      return item;
    });

    // 再次排序并取Top-K
    reranked.sort((a, b) => b.finalScore - a.finalScore);

    // 降低阈值，让更多文档被召回
    const actualThreshold = Math.min(threshold, 0.2);

    // 阈值过滤 + Top-K
    console.log(`[DEBUG] 检索结果数量: ${reranked.length}`);
    console.log(
      `[DEBUG] Top-5 文档分数:`,
      reranked.slice(0, 5).map((item) => ({
        score: item.finalScore.toFixed(4),
        source: item.doc.metadata?.source,
        preview: item.doc.content.substring(0, 50) + "...",
      })),
    );

    const relevantDocs = reranked
      .filter((item) => item.finalScore >= actualThreshold)
      .slice(0, topK)
      .map((item) => ({
        content: item.doc.content,
        metadata: item.doc.metadata,
        similarity: item.finalScore,
      }));

    console.log(`[DEBUG] 过滤后相关文档数量: ${relevantDocs.length}`);
    return relevantDocs;
  }

  /**
   * 构建上下文文本
   * @param {Array} relevantDocs - 相关文档数组
   * @returns {string} 格式化的上下文字符串
   */
  buildContext(relevantDocs) {
    return relevantDocs
      .map((doc, index) => `【参考文档${index + 1}】\n${doc.content}`)
      .join("\n\n");
  }
}

module.exports = new RetrievalService();