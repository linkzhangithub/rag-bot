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
   * 查询扩展：智能提取关键词，增强检索效果
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
    ];

    // 疑问词单独处理，不移除
    const questionWords = ["什么", "怎么", "如何", "哪些", "哪个", "怎样"];

    // 简单分词（按空格和标点）
    const words = query.split(/[\s,，。！？、]+/).filter((w) => w.length > 0);

    // 过滤停用词，但保留疑问词和核心关键词
    const keywords = words.filter(
      (w) => !stopWords.includes(w) || questionWords.includes(w),
    );

    // 如果过滤后还有内容，返回关键词；否则返回原查询
    return keywords.length > 0 ? keywords.join(" ") : query;
  }

  /**
   * 提取核心关键词（去除疑问词，用于向量检索）
   * @param {string} query - 原始查询
   * @returns {string} 核心关键词
   */
  extractCoreKeywords(query) {
    console.log(`[DEBUG] extractCoreKeywords 输入: "${query}"`);

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
      "是什么",
      "是什么意思",
      "介绍一下",
      "讲一下",
      "说一下",
      "解释一下",
    ];

    let result = query;

    // 1. 先尝试按空格和标点分词
    const words = query.split(/[\s,，。！？、]+/).filter((w) => w.length > 0);

    // 2. 如果分词后有多个词，过滤停用词
    if (words.length > 1) {
      const keywords = words.filter((w) => !stopWords.includes(w));
      if (keywords.length > 0) {
        return keywords.join(" ");
      }
    }

    // 3. 如果只有一个词（无空格的中文查询），尝试提取英文单词
    const englishWords = query.match(/[a-zA-Z]+/g);
    if (englishWords && englishWords.length > 0) {
      // 找到英文单词，直接返回英文单词
      return englishWords.join(" ");
    }

    // 4. 尝试去除中文疑问词后缀
    for (const stopWord of stopWords) {
      if (result.endsWith(stopWord)) {
        result = result.slice(0, -stopWord.length);
        break;
      }
      if (result.startsWith(stopWord)) {
        result = result.slice(stopWord.length);
        break;
      }
    }

    // 5. 如果结果为空，返回原查询
    const finalResult = result.trim() || query;
    console.log(`[DEBUG] extractCoreKeywords 输出: "${finalResult}"`);
    return finalResult;
  }

  /**
   * 简单的TF-IDF/BM25关键词匹配分数（智能匹配）
   * @param {string} query - 查询问题
   * @param {string} text - 文档内容
   * @returns {number} 关键词匹配分数 (0-1)
   */
  calculateKeywordScore(query, text) {
    // 去除所有空格，统一转小写
    const queryNormalized = query.toLowerCase().replace(/\s+/g, "");
    const textNormalized = text.toLowerCase().replace(/\s+/g, "");

    // 提取核心关键词
    const coreKeywords = this.extractCoreKeywords(query)
      .toLowerCase()
      .replace(/\s+/g, "");

    let score = 0;

    // 1. 核心关键词完整匹配（加分）
    if (coreKeywords.length > 0 && textNormalized.includes(coreKeywords)) {
      score += 0.6;
    }

    // 2. 分词后的关键词匹配
    const queryWords = query
      .toLowerCase()
      .split(/[\s,，。！？、]+/)
      .filter((w) => w.length > 0);
    const textLower = text.toLowerCase();

    if (queryWords.length > 0) {
      let matchCount = 0;
      for (const word of queryWords) {
        if (textLower.includes(word)) {
          matchCount++;
        }
      }
      score += (matchCount / queryWords.length) * 0.4;
    }

    return Math.min(score, 1);
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

    // 用核心关键词进行向量检索
    const coreKeywords = this.extractCoreKeywords(query);
    const queryEmbedding = await embeddingService.getEmbedding(
      coreKeywords || query,
    );

    // 计算所有文档的向量相似度
    const similarities = allDocs.map((doc, index) => ({
      index,
      doc,
      vectorScore: cosineSimilarity(queryEmbedding, doc.embedding),
      keywordScore: this.calculateKeywordScore(query, doc.content),
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
      const textLower = item.doc.content.toLowerCase();
      const textNoSpace = textLower.replace(/\s+/g, "");
      const queryNoSpace = query.toLowerCase().replace(/\s+/g, "");
      const coreNoSpace = coreKeywords.toLowerCase().replace(/\s+/g, "");

      let coverageScore = 0;

      // 1. 核心关键词完整匹配（去除空格）
      if (coreNoSpace.length > 0 && textNoSpace.includes(coreNoSpace)) {
        coverageScore += 0.5;
      }

      // 2. 查询完整匹配（去除空格）
      if (textNoSpace.includes(queryNoSpace)) {
        coverageScore += 0.3;
      }

      // 3. 单个关键词匹配
      const queryWords = query
        .toLowerCase()
        .split(/[\s,，。！？、]+/)
        .filter((w) => w.length > 0);
      let wordMatchCount = 0;
      for (const word of queryWords) {
        if (textLower.includes(word)) {
          wordMatchCount++;
        }
      }
      if (queryWords.length > 0) {
        coverageScore += (wordMatchCount / queryWords.length) * 0.2;
      }

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
