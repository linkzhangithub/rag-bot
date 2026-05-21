/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * API 错误（4xx）
 */
class ApiError extends AppError {
  constructor(message, statusCode = 400) {
    super(message, statusCode);
    this.name = 'ApiError';
  }
}

/**
 * 验证错误
 */
class ValidationError extends ApiError {
  constructor(message) {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

/**
 * 未找到错误
 */
class NotFoundError extends ApiError {
  constructor(message = '资源未找到') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  AppError,
  ApiError,
  ValidationError,
  NotFoundError,
};
