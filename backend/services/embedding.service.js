const https = require('https');
const config = require('../config');
const { retryWithBackoff } = require('../utils/retry-utils');

/**
 * 向量嵌入服务
 * 调用智谱 AI embedding-2 模型
 */
class EmbeddingService {
  /**
   * 调用智谱 API
   * @param {string} apiPath - API 路径
   * @param {object} data - 请求数据
   * @returns {Promise<object>} API 响应
   */
  callZhipuAPI(apiPath, data) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(data);
      const options = {
        hostname: 'open.bigmodel.cn',
        port: 443,
        path: `/api/paas/v4${apiPath}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.zhipuApiKey}`,
        },
        timeout: 30000, // 30秒超时
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (e) {
            console.error('解析响应失败:', e);
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        console.error('API 请求失败:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API 请求超时'));
      });

      req.write(body);
      req.end();
    });
  }

  /**
   * 获取文本的向量表示（带重试机制）
   * @param {string} text - 输入文本
   * @returns {Promise<number[]>} 向量数组
   */
  async getEmbedding(text) {
    return retryWithBackoff(
      async () => {
        const response = await this.callZhipuAPI('/embeddings', {
          model: 'embedding-2',
          input: text,
        });

        if (
          !response ||
          !response.data ||
          !Array.isArray(response.data) ||
          response.data.length === 0
        ) {
          throw new Error('嵌入响应格式错误');
        }

        return response.data[0].embedding;
      },
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (attempt, error, delay) => {
          console.log(`获取嵌入向量失败，第${attempt}次重试...`);
        },
      }
    );
  }
}

module.exports = new EmbeddingService();
