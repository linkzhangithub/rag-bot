/**
 * 重试工具函数
 * 面试可讲：指数退避策略、错误分类处理
 */

/**
 * 带重试的异步函数执行
 * @param {Function} fn - 要执行的异步函数
 * @param {object} options - 配置选项
 * @returns {Promise<any>} 函数执行结果
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,        // 最大重试次数
    baseDelay = 1000,      // 基础延迟（毫秒）
    maxDelay = 10000,      // 最大延迟（毫秒）
    onRetry = null,        // 重试回调
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 判断是否应该重试
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw classifyError(error);
      }

      // 计算延迟时间（指数退避）
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      // 调用重试回调
      if (onRetry) {
        onRetry(attempt, error, delay);
      }

      console.log(`第${attempt}次重试，等待${delay}ms...`);
      
      // 等待后重试
      await sleep(delay);
    }
  }

  throw classifyError(lastError);
}

/**
 * 判断错误是否应该重试
 */
function shouldRetry(error) {
  // 网络错误、超时、5xx服务器错误可以重试
  return (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND' ||
    (error.statusCode && error.statusCode >= 500) ||
    error.message.includes('timeout') ||
    error.message.includes('network')
  );
}

/**
 * 错误分类
 */
function classifyError(error) {
  // 网络错误
  if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
    return new Error(`网络连接失败: ${error.message}`);
  }

  // 超时错误
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return new Error('请求超时，请稍后重试');
  }

  // API限流
  if (error.statusCode === 429) {
    return new Error('API调用频率超限，请稍后再试');
  }

  // 认证错误
  if (error.statusCode === 401 || error.statusCode === 403) {
    return new Error('API密钥无效或权限不足');
  }

  // 服务器错误
  if (error.statusCode && error.statusCode >= 500) {
    return new Error('服务器内部错误，请稍后重试');
  }

  // 参数错误
  if (error.statusCode === 400) {
    return new Error(`请求参数错误: ${error.message}`);
  }

  // 默认错误
  return error;
}

/**
 * 延迟函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  retryWithBackoff,
  classifyError,
};
