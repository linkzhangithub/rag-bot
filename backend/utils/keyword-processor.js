/**
 * 关键词处理工具类
 * 负责关键词提取、查询扩展、关键词匹配评分等功能
 */
class KeywordProcessor {
  constructor() {
    this.stopWords = [
      "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你",
      "会", "着", "没有", "看", "好", "自己", "这", "他", "她", "它", "们", "什么", "怎么", "如何", "哪些", "哪个", "怎样",
      "吗", "呢", "吧", "啊", "哦", "呀", "呢", "啦", "吧", "哦", "啊", "嗯", "唉", "哦", "呀", "哈", "嘿", "喂"
    ];
  }

  /**
   * 提取核心关键词（去除疑问词和停用词）
   * @param {string} query - 原始查询
   * @returns {string} 核心关键词
   */
  extractCoreKeywords(query) {
    if (!query) return '';
    
    const words = query.split(/[\s,，。！？、]+/).filter((w) => w.length > 0);
    const keywords = words.filter(w => !this.stopWords.includes(w));
    
    return keywords.length > 0 ? keywords.join(' ') : query;
  }

  /**
   * 查询扩展 - 添加同义词和相关词
   * @param {string} query - 原始查询
   * @returns {string} 扩展后的查询
   */
  expandQuery(query) {
    if (!query) return '';
    
    const coreKeywords = this.extractCoreKeywords(query);
    if (!coreKeywords) return query;
    
    const expansionMap = {
      'pinia': ['Pinia', 'pinia', 'Vue状态管理', 'store'],
      'rag': ['RAG', '检索增强生成', '知识库问答', '知识检索'],
      '人工智能': ['AI', '机器学习', '深度学习', '神经网络'],
      '前端': ['前端开发', 'Web开发', 'Vue', 'React', 'JavaScript'],
      '后端': ['后端开发', 'Node.js', '服务器', 'API'],
      '数据库': ['DB', 'MySQL', 'PostgreSQL', 'MongoDB'],
      '缓存': ['Redis', '缓存策略', '内存缓存'],
      '性能': ['优化', '性能优化', '加载速度', '响应时间'],
      '安全': ['认证', '授权', '加密', '防护']
    };
    
    let expanded = coreKeywords;
    for (const [keyword, synonyms] of Object.entries(expansionMap)) {
      if (coreKeywords.toLowerCase().includes(keyword)) {
        expanded += ' ' + synonyms.join(' ');
      }
    }
    
    return expanded;
  }

  /**
   * 计算关键词匹配分数（TF-IDF/BM25简化版）
   * @param {string} query - 查询问题
   * @param {string} text - 文档内容
   * @returns {number} 关键词匹配分数 (0-1)
   */
  calculateKeywordScore(query, text) {
    if (!query || !text) return 0;
    
    // 去除所有空格，统一转小写
    const queryNormalized = query.toLowerCase().replace(/\s+/g, '');
    const textNormalized = text.toLowerCase().replace(/\s+/g, '');
    
    // 提取核心关键词
    const coreKeywords = this.extractCoreKeywords(query)
      .toLowerCase()
      .replace(/\s+/g, '');
    
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
   * 计算覆盖度分数（用于Rerank）
   * @param {string} query - 查询问题
   * @param {string} text - 文档内容
   * @returns {number} 覆盖度分数 (0-1)
   */
  calculateCoverageScore(query, text) {
    if (!query || !text) return 0;
    
    const textLower = text.toLowerCase();
    const textNoSpace = textLower.replace(/\s+/g, "");
    const queryNoSpace = query.toLowerCase().replace(/\s+/g, "");
    const coreKeywords = this.extractCoreKeywords(query);
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

    return coverageScore;
  }
}

module.exports = new KeywordProcessor();