const https = require('https');
const config = require('../config');

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
   * 普通问答（非流式）
   * @param {string} question - 用户问题
   * @param {Array} relevantDocs - 相关文档数组
   * @param {Array} history - 对话历史（可选）
   * @returns {Promise<string>} AI 回答
   */
  async chat(question, relevantDocs, history = []) {
    const context = relevantDocs.map((doc, index) => `【参考文档${index + 1}】\n${doc.content}`).join('\n\n');
    const prompt = this.buildPrompt(context, question);

    // 构建消息列表（包含历史）
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的文档问答助手，必须严格按照提供的参考文档内容进行回答，不得虚构信息。',
      },
    ];

    // 添加历史对话（最近5轮）
    const recentHistory = history.slice(-10);
    messages.push(...recentHistory);

    // 添加当前问题
    messages.push({ role: 'user', content: prompt });

    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: 'glm-4-flash',
        messages,
        temperature: 0.1,
        top_p: 0.5,
      });

      const options = {
        hostname: 'open.bigmodel.cn',
        port: 443,
        path: '/api/paas/v4/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.zhipuApiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(responseData);

            if (
              !response ||
              !response.choices ||
              !Array.isArray(response.choices) ||
              response.choices.length === 0
            ) {
              throw new Error('对话响应格式错误');
            }

            if (!response.choices[0].message || !response.choices[0].message.content) {
              throw new Error('对话响应中缺少消息内容');
            }

            resolve(response.choices[0].message.content);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(body);
      req.end();
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
    const context = relevantDocs.map((doc, index) => `【参考文档${index + 1}】\n${doc.content}`).join('\n\n');
    const prompt = this.buildPrompt(context, question);

    // 注意：响应头已在 routes 层设置，这里不需要再调用 writeHead

    // 构建消息列表（包含历史）
    const messages = [
      {
        role: 'system',
        content: '你是一个专业的文档问答助手，必须严格按照提供的参考文档内容进行回答，不得虚构信息。',
      },
    ];

    // 添加历史对话（最近5轮）
    const recentHistory = history.slice(-10);
    messages.push(...recentHistory);

    // 添加当前问题
    messages.push({ role: 'user', content: prompt });

    const body = JSON.stringify({
      model: 'glm-4-flash',
      messages,
      temperature: 0.1,
      top_p: 0.5,
      stream: true, // 启用流式输出
    });

    const options = {
      hostname: 'open.bigmodel.cn',
      port: 443,
      path: '/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.zhipuApiKey}`,
      },
      timeout: 60000, // 60秒超时
    };

    const req = https.request(options, (apiRes) => {
      apiRes.on('data', (chunk) => {
        const text = chunk.toString();
        const lines = text.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // 流结束
              res.write('data: [DONE]\n\n');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';

              if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                // 调用回调函数（用于收集完整答案）
                if (onChunk) {
                  onChunk(content);
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      });

      apiRes.on('end', () => {
        res.write('data: [DONE]\n\n');
        res.end();
      });
    });

    req.on('error', (error) => {
      console.error('SSE 请求失败:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('SSE 请求超时');
      res.write(`data: ${JSON.stringify({ error: '请求超时，请稍后重试' })}\n\n`);
      res.end();
    });

    req.write(body);
    req.end();
  }
}

module.exports = new LlmService();
