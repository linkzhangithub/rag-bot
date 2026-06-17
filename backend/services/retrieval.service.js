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
   * 检测中文人名（简单规则：连续2-4个中文汉字）
   * @param {string} text - 文本
   * @returns {Array} 人名数组
   */
  extractChineseNames(text) {
    const namePattern = /[\u4e00-\u9fa5]{2,4}/g;
    const matches = text.match(namePattern) || [];
    return matches.filter((name) => {
      // 过滤常见词
      const commonWords = [
        "的",
        "了",
        "在",
        "是",
        "有",
        "和",
        "就",
        "不",
        "都",
        "一",
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
        "可以",
        "不能",
        "知道",
        "问题",
        "回答",
        "文档",
        "内容",
        "信息",
        "学习",
        "工作",
        "项目",
        "开发",
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
        "设计",
        "管理",
        "用户",
        "时间",
        "需要",
        "可能",
        "已经",
        "现在",
        "因为",
        "所以",
        "但是",
        "如果",
        "虽然",
        "还是",
        "应该",
        "必须",
        "不会",
        "不要",
        "不是",
        "一个",
        "一些",
        "这个",
        "那个",
        "这些",
        "那些",
        "为什么",
        "哪里",
        "时候",
        "地方",
        "事情",
        "东西",
        "方式",
        "方法",
        "答案",
        "结果",
        "原因",
        "例子",
        "情况",
        "过程",
        "步骤",
        "原则",
        "目的",
        "意义",
        "重要",
        "关键",
        "核心",
        "主要",
        "基本",
        "简单",
        "复杂",
        "困难",
        "容易",
        "正确",
        "错误",
        "成功",
        "失败",
        // 职业相关
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
        // 学历相关
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
        // 证书相关
        "证书",
        "认证",
        "资格",
        "考试",
        "等级",
        "职称",
        "荣誉",
        "奖励",
        "奖项",
        // 技术相关
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
        // 其他
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
      ];
      return !commonWords.includes(name);
    });
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

    // 提取查询中的中文人名
    const queryNames = this.extractChineseNames(query);
    const hasName = queryNames.length > 0;

    console.log(`[DEBUG] 检索查询: ${query}`);
    console.log(`[DEBUG] 扩展查询: ${expandedQuery}`);
    console.log(
      `[DEBUG] 提取的人名: ${queryNames.join(", ") || "无"} (hasName: ${hasName})`,
    );
    console.log(`[DEBUG] 文档总数: ${allDocs.length}`);

    // 计算所有文档的向量相似度
    const similarities = allDocs.map((doc, index) => {
      const vectorScore = cosineSimilarity(queryEmbedding, doc.embedding);
      const keywordScore = this.calculateKeywordScore(query, doc.content);

      // 如果查询包含人名，检查文档是否包含该人名
      let nameBonus = 0;
      if (hasName) {
        const textLower = doc.content.toLowerCase();
        for (const name of queryNames) {
          if (textLower.includes(name.toLowerCase())) {
            nameBonus += 0.3; // 人名匹配加分
          }
        }
      }

      return {
        index,
        doc,
        vectorScore,
        keywordScore,
        nameBonus,
      };
    });

    // 混合评分：向量50% + 关键词30% + 人名匹配20%
    similarities.forEach((item) => {
      item.hybridScore =
        item.vectorScore * 0.5 + item.keywordScore * 0.3 + item.nameBonus;
    });

    // 按混合分数降序排序
    similarities.sort((a, b) => b.hybridScore - a.hybridScore);

    // 先取Top-30候选（增加候选数量）
    const candidates = similarities.slice(0, 30);

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

      // 如果查询包含人名，提高人名匹配的权重
      let finalCoverageScore = coverageScore;
      if (hasName) {
        const textLower = item.doc.content.toLowerCase();
        let nameMatchCount = 0;
        for (const name of queryNames) {
          if (textLower.includes(name.toLowerCase())) {
            nameMatchCount++;
          }
        }
        const nameMatchRatio = nameMatchCount / queryNames.length;
        finalCoverageScore = coverageScore * 0.5 + nameMatchRatio * 0.5;
      }

      // 最终分数：混合分数70% + 覆盖度30%
      item.finalScore = item.hybridScore * 0.7 + finalCoverageScore * 0.3;

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

    // 如果没有找到相关文档，但查询包含人名，降低阈值重试
    if (relevantDocs.length === 0 && hasName) {
      const lowerThreshold = Math.max(0.1, threshold * 0.5);
      const fallbackDocs = reranked
        .filter((item) => item.finalScore >= lowerThreshold)
        .slice(0, topK)
        .map((item) => ({
          content: item.doc.content,
          metadata: item.doc.metadata,
          similarity: item.finalScore,
        }));
      return fallbackDocs;
    }

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
