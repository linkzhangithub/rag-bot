const HttpUtils = require('../utils/http-utils');
const RetryUtils = require('../utils/retry-utils');

/**
 * LLM 服务
 * 调用智谱 GLM-4 模型，支持 SSE 流式输出
 */
class LlmService {
  /**
   * 构建问答 Prompt
   * @param {string} context - 参考文档上下文
   * @param {string} question - 用户问题
   * @returns {string} 完整的 prompt
   */
  buildPrompt(context, question) {
    return `你是一个严格基于参考文档的问答助手。

**核心指令：**
1. 基于参考文档中的信息回答，可以进行合理的逻辑推理和总结归纳，但不能编造文档中没有的事实或数据
2. 如果文档中没有相关信息，请直接回答"根据现有资料，我无法回答这个问题。"
3. 如果参考文档中没有足够信息来完整回答问题，直接回答"在现有文档中没有找到与您问题相关的信息"，不要尝试用你自己的知识补充回答，不要给出通用建议。
4. 不要编造答案，不要使用文档外的知识
5. 如果有多个相关文档，请综合所有相关信息进行回答
6. **重要：在回答中引用来源时，使用 [1]、[2] 等编号格式标注对应的参考文档**
7. **在回答末尾添加 "\n\n---\n**参考资料：**" 部分，列出引用的文档编号和简要说明**

**参考文档：**
${context}

**用户问题：**
${question}`;
  }

  /**
   * 构建消息列表（包含历史对话）
   * @param {string} prompt - 完整的 prompt
   * @param {Array} history - 对话历史
   * @returns {Array} 消息列表
   */
  buildMessages(prompt, history = []) {
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的文档问答助手，必须严格按照提供的参考文档内容进行回答，不得虚构信息。',
      },
    ];

    // 添加最近10轮历史对话
    const recentHistory = history.slice(-10);
    messages.push(...recentHistory);

    // 添加当前问题
    messages.push({ role: 'user', content: prompt });

    return messages;
  }

  /**
   * 构建上下文文本
   * @param {Array} relevantDocs - 相关文档数组
   * @returns {string} 格式化的上下文字符串
   */
  buildContext(relevantDocs) {
    return relevantDocs.map((doc, index) => `【参考文档${index + 1}】\n${doc.content}`).join('\n\n');
  }

  /**
   * 普通问答（非流式）
   * @param {string} question - 用户问题
   * @param {Array} relevantDocs - 相关文档数组
   * @param {Array} history - 对话历史（可选）
   * @returns {Promise<string>} AI 回答
   */
  async chat(question, relevantDocs, history = []) {
    const context = this.buildContext(relevantDocs);
    const prompt = this.buildPrompt(context, question);
    const messages = this.buildMessages(prompt, history);

    // 用指数退避重试包裹 API 调用
    return RetryUtils.withBackoff(() => {
      return HttpUtils.request(messages, { stream: false });
    });
  }

  /**
   * SSE 流式问答
   * @param {string} question - 用户问题
   * @param {Array} relevantDocs - 相关文档数组
   * @param {object} res - Express 响应对象
   * @param {Array} history - 对话历史（可选）
   * @param {Function} onChunk - 每个数据块的回调（可选）
   */
  async chatStream(question, relevantDocs, res, history = [], onChunk) {
    const context = this.buildContext(relevantDocs);
    const prompt = this.buildPrompt(context, question);
    const messages = this.buildMessages(prompt, history);
    
    return HttpUtils.request(messages, { stream: true, res, onChunk });
  }
}

module.exports = new LlmService();