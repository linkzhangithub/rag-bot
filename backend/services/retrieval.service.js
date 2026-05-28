const { cosineSimilarity } = require("../utils/cosine");
const embeddingService = require("./embedding.service");
const vectorStore = require("./vector-store.service");
const config = require("../config");

/**
 * 检索服务
 * 流程：问题 embedding → 余弦相似度 → 阈值过滤 → Top-K 排序
 * 新增：BM25关键词检索 + 混合检索（向量70% + 关键词30%）
 */
class RetrievalService {
  /**
   * 查询扩展：提取关键词，增强检索效果
   * @param {string} query - 原始查询
   * @returns {string} 扩展后的查询
   */
  expandQuery(query) {
    // 移除疑问词和助词，保留核心关键词
    const stopWords = [
      "的",
      "了",
      "在",
      "是",
      "我",
      "有",
      "和",
      "就",
      "不",
      "人",
      "都",
      "一",
      "一个",
      "上",
      "也",
      "很",
      "到",
      "说",
      "要",
      "去",
      "你",
      "会",
      "着",
      "没有",
      "看",
      "好",
      "自己",
      "这",
      "他",
      "她",
      "它",
      "们",
      "什么",
      "怎么",
      "如何",
      "哪些",
      "哪个",
      "怎样",
    ];

    // 简单分词（按空格和标点）
    const words = query.split(/[\s,，。！？、]+/).filter((w) => w.length > 0);

    // 过滤停用词，保留关键词
    const keywords = words.filter((w) => !stopWords.includes(w));

    // 如果过滤后还有内容，返回关键词；否则返回原查询
    return keywords.length > 0 ? keywords.join(" ") : query;
  }

  /**
   * 简单的TF-IDF/BM25关键词匹配分数
   * @param {string} query - 查询问题
   * @param {string} text - 文档内容
   * @returns {number} 关键词匹配分数 (0-1)
   */
  calculateKeywordScore(query, text) {
    // 分词（简单按空格和中文分割）
    const queryWords = query
      .toLowerCase()
      .split(/[\s,，。！？、]+/)
      .filter((w) => w.length > 0);
    const textLower = text.toLowerCase();

    if (queryWords.length === 0) return 0;

    // 计算匹配的关键词数量
    let matchCount = 0;
    for (const word of queryWords) {
      if (textLower.includes(word)) {
        matchCount++;
      }
    }

    // 返回匹配比例
    return matchCount / queryWords.length;
  }

  /**
   * 检索相关文档（混合检索：向量 + 关键词）
   * @param {string} query - 查询问题
   * @param {object} options - 配置选项
   * @returns {Promise<Array>} 相关文档数组
   */
  async retrieve(query, options = {}) {
    const { topK = config.topK, threshold = config.similarityThreshold } =
      options;

    const allDocs = vectorStore.getAll();

    if (allDocs.length === 0) {
      return [];
    }

    // 查询预处理：提取关键词
    const expandedQuery = this.expandQuery(query);

    // 获取问题的向量表示
    const queryEmbedding = await embeddingService.getEmbedding(expandedQuery);

    // 计算所有文档的向量相似度
    const similarities = allDocs.map((doc, index) => ({
      index,
      doc,
      vectorScore: cosineSimilarity(queryEmbedding, doc.embedding),
      keywordScore: this.calculateKeywordScore(query, doc.content),
    }));

    // 混合评分：向量60% + 关键词40%（提高关键词权重）
    similarities.forEach((item) => {
      item.hybridScore = item.vectorScore * 0.6 + item.keywordScore * 0.4;
    });

    // 按混合分数降序排序
    similarities.sort((a, b) => b.hybridScore - a.hybridScore);

    // 先取Top-20候选（增加候选数量）
    const candidates = similarities.slice(0, 20);

    // Rerank：优先选包含问题关键词的片段
    const reranked = candidates.map((item) => {
      const textLower = item.doc.content.toLowerCase();
      const queryWords = query
        .toLowerCase()
        .split(/[\s,，。！？、]+/)
        .filter((w) => w.length > 1);

      // 计算关键词覆盖度（作为rerank因子）
      let keywordCoverage = 0;
      for (const word of queryWords) {
        if (textLower.includes(word)) {
          keywordCoverage += 1;
        }
      }
      const coverageScore =
        queryWords.length > 0 ? keywordCoverage / queryWords.length : 0;

      // 最终分数：混合分数80% + 覆盖度20%
      item.finalScore = item.hybridScore * 0.8 + coverageScore * 0.2;

      return item;
    });

    // 再次排序并取Top-K
    reranked.sort((a, b) => b.finalScore - a.finalScore);

    // 阈值过滤 + Top-K
    const relevantDocs = reranked
      .filter((item) => item.finalScore >= threshold)
      .slice(0, topK)
      .map((item) => ({
        content: item.doc.content,
        metadata: item.doc.metadata,
        similarity: item.finalScore,
      }));

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
