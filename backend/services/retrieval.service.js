const { cosineSimilarity } = require("../utils/cosine");
const embeddingService = require("./embedding.service");
const vectorStore = require("./vector-store.service");
const config = require("../config");

/**
 * 检索服务
 * 流程：问题 embedding → 余弦相似度 → 相对排序 → Top-K
 * 优化：中文分词 + 关键词扩展 + 相对排序
 */
class RetrievalService {
  /**
   * 简单的中文分词（基于规则，不引入依赖）
   * @param {string} text - 输入文本
   * @returns {string[]} 分词结果数组
   */
  simpleChineseTokenize(text) {
    if (!text) return [];

    // 扩展词组表（按长度降序排列，优先匹配长词）
    const phrases = [
      // RAG 相关（大小写全包含）
      "检索增强生成",
      "Retrieval-Augmented Generation",
      "Retrieval Augmented Generation",
      "RAG",
      "rag",
      "Rag",
      "R.A.G",
      "脑机接口",
      "Brain-Computer Interface",
      "Brain Computer Interface",
      "BCI",
      "bci",
      "人工智能",
      "Artificial Intelligence",
      "AI",
      "ai",
      "大语言模型",
      "Large Language Model",
      "LLM",
      "llm",
      "GPT",
      "机器学习",
      "深度学习",
      "自然语言处理",
      "NLP",
      "向量数据库",
      "向量检索",
      "向量化",
      "Embedding",
      "embedding",
      "知识库问答",
      "知识检索",
      "文档检索",
    ].sort((a, b) => b.length - a.length); // 长词优先

    // 1. 提取英文和数字词
    const englishPattern = /[a-zA-Z0-9]{1,}/g;
    const englishWords = (text.match(englishPattern) || []).map((w) =>
      w.toLowerCase(),
    );

    // 2. 提取词组（忽略大小写）
    let remainingText = text;
    const foundPhrases = [];
    for (const phrase of phrases) {
      const regex = new RegExp(this.escapeRegExp(phrase), "gi");
      if (regex.test(remainingText)) {
        foundPhrases.push(phrase.toLowerCase());
        remainingText = remainingText.replace(regex, " ");
      }
    }

    // 3. 提取中文词（2-6个连续汉字）
    const chinesePattern = /[\u4e00-\u9fa5]{2,6}/g;
    const chineseWords = remainingText.match(chinesePattern) || [];

    // 去重合并
    const allTokens = [
      ...new Set([...englishWords, ...foundPhrases, ...chineseWords]),
    ];
    return allTokens.filter((t) => t.length > 1);
  }

  /**
   * 转义正则特殊字符
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * 关键词扩展（同义词映射）
   * @param {string} query - 原始查询
   * @returns {string} 扩展后的查询
   */
  expandQuery(query) {
    const queryLower = query.toLowerCase().trim();

    // 增强同义词映射表
    const synonyms = {
      // RAG 核心扩展
      rag: "检索增强生成 RAG 知识库问答 文档检索",
      检索增强生成: "RAG retrieval-augmented-generation 知识库问答",

      // RAG 问句扩展
      rag是什么: "RAG 检索增强生成 定义 概念 原理 含义",
      什么是rag: "RAG 检索增强生成 定义 概念 原理 含义",
      rag系统: "RAG 检索增强生成系统 知识库",
      rag技术: "RAG 检索增强生成技术",
      rag指南: "RAG 检索增强生成指南 教程",
      rag实践: "RAG 检索增强生成实践 应用",
      rag工作原理: "RAG 检索增强生成 原理 工作流程",

      // 脑机接口
      bci: "脑机接口 Brain-Computer-Interface BCI",
      脑机接口: "BCI Brain-Computer-Interface 脑机",

      // AI 相关
      ai: "人工智能 Artificial-Intelligence 机器学习",
      人工智能: "AI 机器学习 深度学习",
      大模型: "大语言模型 LLM GPT",
      llm: "大语言模型 LLM GPT",
      gpt: "大语言模型 LLM GPT ChatGPT",

      // 通用疑问词
      什么是: "定义 概念 含义",
      怎么: "方法 方式 如何",
      如何: "方法 步骤 怎样",
      哪些: "哪些 哪些方面",
      哪个: "哪个 哪个方面",
      为什么: "原因 理由 由于",
    };

    // 多重匹配扩展
    let expanded = query;
    for (const [key, expansion] of Object.entries(synonyms)) {
      if (queryLower.includes(key.toLowerCase())) {
        expanded += " " + expansion;
      }
    }

    return expanded;
  }

  /**
   * 停用词列表（疑问词和虚词）
   */
  getStopWords() {
    return new Set([
      // 疑问词
      "什么",
      "怎么",
      "如何",
      "哪些",
      "哪个",
      "怎样",
      "为什么",
      "哪里",
      "多少",
      "几",
      // 虚词
      "的",
      "了",
      "在",
      "和",
      "就",
      "不",
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
      "会",
      "着",
      "看",
      "好",
      "这",
      "他",
      "她",
      "它",
      "们",
      "与",
      "及",
      "或",
      "但",
      "而",
      "且",
      "并",
      "又",
      "再",
      "把",
      "被",
      "给",
      "让",
      "从",
      "向",
      "对",
      "为",
      // 常见动词
      "是",
      "有",
      "没有",
      "能",
      "会",
      "可以",
      "应该",
      "需要",
      "想要",
    ]);
  }

  /**
   * 提取查询关键词
   * @param {string} query - 查询文本
   * @returns {string[]} 关键词数组
   */
  extractKeywords(query) {
    const tokens = this.simpleChineseTokenize(query);
    const stopWords = this.getStopWords();
    return tokens.filter(
      (t) => !stopWords.has(t.toLowerCase()) && t.length > 1,
    );
  }

  /**
   * 计算关键词匹配分数（支持中文分词）
   * @param {string} query - 查询问题
   * @param {string} text - 文档内容
   * @returns {number} 关键词匹配分数 (0-1)
   */
  calculateKeywordScore(query, text) {
    const queryKeywords = this.extractKeywords(query);
    if (queryKeywords.length === 0) return 0.5;

    const textTokens = this.simpleChineseTokenize(text);
    const textLower = text.toLowerCase();

    let matchCount = 0;
    for (const keyword of queryKeywords) {
      // 检查精确匹配或包含匹配
      if (
        textTokens.some(
          (t) =>
            t.includes(keyword.toLowerCase()) ||
            keyword.toLowerCase().includes(t),
        ) ||
        textLower.includes(keyword.toLowerCase())
      ) {
        matchCount++;
      }
    }

    return matchCount / queryKeywords.length;
  }

  /**
   * 检测中文人名
   * @param {string} text - 文本
   * @returns {Array} 人名数组
   */
  extractChineseNames(text) {
    const namePattern = /[\u4e00-\u9fa5]{2,4}/g;
    const matches = text.match(namePattern) || [];
    const stopWords = this.getStopWords();

    return matches
      .filter((name) => {
        return !stopWords.has(name) && name.length >= 2;
      })
      .filter((name) => {
        const techTerms = [
          "工程师",
          "开发",
          "设计",
          "产品",
          "经理",
          "测试",
          "运维",
          "架构",
          "总监",
          "主管",
          "专员",
          "顾问",
          "专家",
          "助理",
          "分析师",
          "本科",
          "硕士",
          "博士",
          "大专",
          "学士",
          "学位",
          "毕业",
          "学校",
          "大学",
          "学院",
          "证书",
          "认证",
          "资格",
          "考试",
          "等级",
          "职称",
          "荣誉",
          "奖励",
          "奖项",
          "语言",
          "框架",
          "工具",
          "平台",
          "软件",
          "硬件",
          "网络",
          "数据库",
          "算法",
          "编程",
          "代码",
          "经验",
          "能力",
          "技能",
          "职责",
          "负责",
          "参与",
          "主导",
          "完成",
          "优化",
          "改进",
          "解决",
          "应用",
          "研究",
          "技术",
          "系统",
          "服务",
          "功能",
          "使用",
          "进行",
          "实现",
          "处理",
          "数据",
          "分析",
        ];
        return !techTerms.includes(name);
      });
  }

  /**
   * 检索相关文档（混合检索 + 相对排序）
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

    // 1. 查询归一化
    const normalizedQuery = query
      .toLowerCase()
      .replace(/[？?！!。，，、]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // 2. 扩展查询
    const expandedQuery = this.expandQuery(normalizedQuery);

    // 3. 提取关键词
    const keywords = this.extractKeywords(expandedQuery);

    // 4. 获取查询向量
    const queryEmbedding = await embeddingService.getEmbedding(expandedQuery);

    // 5. 提取人名
    const queryNames = this.extractChineseNames(query);
    const hasName = queryNames.length > 0;

    console.log(`[DEBUG] 检索查询: ${query}`);
    console.log(`[DEBUG] 扩展查询: ${expandedQuery}`);
    console.log(`[DEBUG] 提取关键词: ${keywords.join(", ") || "无"}`);
    console.log(`[DEBUG] 人名: ${queryNames.join(", ") || "无"}`);

    // 6. 计算混合分数
    const similarities = allDocs.map((doc) => {
      const vectorScore = cosineSimilarity(queryEmbedding, doc.embedding);
      const keywordScore = this.calculateKeywordScore(
        expandedQuery,
        doc.content,
      );

      // 人名匹配加分
      let nameBonus = 0;
      if (hasName) {
        const textLower = doc.content.toLowerCase();
        for (const name of queryNames) {
          if (textLower.includes(name.toLowerCase())) {
            nameBonus += 0.15;
          }
        }
      }

      // 短查询：降低向量权重，提高关键词权重
      const isShortQuery = query.length < 8;
      const vectorWeight = isShortQuery ? 0.5 : 0.6;
      const keywordWeight = isShortQuery ? 0.4 : 0.3;
      const nameWeight = hasName ? 0.1 : 0;

      const hybridScore =
        vectorScore * vectorWeight +
        keywordScore * keywordWeight +
        Math.min(nameBonus, nameWeight);

      return {
        doc,
        vectorScore,
        keywordScore,
        hybridScore,
      };
    });

    // 7. 按分数排序
    similarities.sort((a, b) => b.hybridScore - a.hybridScore);

    // 8. 取Top-K候选
    const candidates = similarities.slice(0, Math.max(topK, 10));

    // 9. Rerank：计算关键词覆盖度
    const reranked = candidates.map((item) => {
      const textLower = item.doc.content.toLowerCase();

      let keywordMatches = 0;
      for (const kw of keywords) {
        if (textLower.includes(kw.toLowerCase())) {
          keywordMatches++;
        }
      }
      const coverageScore =
        keywords.length > 0 ? keywordMatches / keywords.length : 0.5;

      // 最终分数：混合分数80% + 覆盖度20%
      item.finalScore = item.hybridScore * 0.8 + coverageScore * 0.2;

      return item;
    });

    // 10. 排序并输出
    reranked.sort((a, b) => b.finalScore - a.finalScore);

    // 输出调试信息
    console.log(`[DEBUG] Top-3 分数:`);
    reranked.slice(0, 3).forEach((item, i) => {
      console.log(
        `  ${i + 1}. ${item.finalScore.toFixed(4)} - ${item.doc.metadata?.source}`,
      );
    });

    // 11. 相对排序：始终返回 Top-K（根据分数排序）
    const relevantDocs = reranked.slice(0, topK).map((item) => ({
      content: item.doc.content,
      metadata: item.doc.metadata,
      similarity: item.finalScore,
    }));

    return relevantDocs;
  }

  /**
   * 构建上下文文本
   */
  buildContext(relevantDocs) {
    return relevantDocs
      .map((doc, index) => `【参考文档${index + 1}】\n${doc.content}`)
      .join("\n\n");
  }
}

module.exports = new RetrievalService();
