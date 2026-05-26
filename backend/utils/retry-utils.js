/**
 * 重试工具类
 * 提供指数退避重试机制
 */
class RetryUtils {
  /**
   * 指数退避重试工具函数
   * @param {Function} fn - 要执行的异步函数
   * @param {Object} options - 重试选项
   * @param {number} options.maxRetries - 最大重试次数，默认 3
   * @param {number} options.baseDelay - 基础延迟（毫秒），默认 1000
   * @returns {Promise<any>} - 函数执行结果
   */
  static async withBackoff(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 检查是否需要重试
        const shouldRetry = this.shouldRetry(error, attempt, maxRetries);
        if (!shouldRetry) {
          throw error;
        }

        // 计算延迟时间并打印日志
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[RetryUtils] 请求失败，${delay / 1000}秒后重试 (${attempt + 1}/${maxRetries})`, error.message);

        // 延迟重试
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * 判断是否需要重试
   * @param {Error} error - 错误对象
   * @param {number} attempt - 当前尝试次数
   * @param {number} maxRetries - 最大重试次数
   * @returns {boolean} - 是否需要重试
   */
  static shouldRetry(error, attempt, maxRetries) {
    // 超过最大重试次数
    if (attempt >= maxRetries) return false;

    // 4xx 客户端错误（不重试），除了 429 限流
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
      return false;
    }

    // 429 限流错误（重试）
    if (error.statusCode === 429) {
      return true;
    }

    // 网络错误（重试）
    const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
    if (error.code && networkErrors.includes(error.code)) {
      return true;
    }

    // 超时错误（重试）
    if (error.message && error.message.toLowerCase().includes('timeout')) {
      return true;
    }

    // 5xx 服务器错误（重试）
    if (error.statusCode && error.statusCode >= 500) {
      return true;
    }

    // 默认不重试
    return false;
  }
}

module.exports = RetryUtils;