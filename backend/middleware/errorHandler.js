/**
 * 统一错误处理中间件
 * 提供标准化的错误响应格式
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class RateLimitError extends AppError {
  constructor(message = '请求过于频繁，请稍后重试') {
    super(message, 429, 'RATE_LIMITED');
  }
}

/**
 * 错误处理中间件
 */
function errorHandler(err, req, res, next) {
  console.error(`[${new Date().toISOString()}] 错误: ${err.code || 'UNKNOWN'} - ${err.message}`);
  console.error(err.stack);

  // 默认错误响应
  let response = {
    success: false,
    error: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR',
  };

  // 根据错误类型设置状态码和响应内容
  if (err instanceof AppError) {
    res.status(err.statusCode);
    
    // 添加错误详情（仅开发环境）
    if (process.env.NODE_ENV === 'development') {
      response.details = err.stack;
    }
  } else if (err.name === 'SyntaxError') {
    res.status(400);
    response.error = '请求体格式错误，请检查JSON格式';
    response.code = 'INVALID_JSON';
  } else if (err.name === 'ValidationError') {
    res.status(400);
    response.error = '数据验证失败';
    response.code = 'VALIDATION_ERROR';
    if (err.errors) {
      response.details = err.errors;
    }
  } else {
    res.status(500);
    response.error = '服务器内部错误，请稍后重试';
    
    // 生产环境不暴露详细错误信息
    if (process.env.NODE_ENV !== 'production') {
      response.details = err.message;
    }
  }

  res.json(response);
}

/**
 * 捕获异步错误的包装函数
 */
function catchAsync(fn) {
  return function(req, res, next) {
    fn(req, res, next).catch(next);
  };
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  errorHandler,
  catchAsync,
};
