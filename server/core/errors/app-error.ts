/**
 * 应用统一错误类
 * 提供标准化的错误处理和日志记录
 */

import { HTTP_STATUS, ERROR_CODES } from '../constants';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public shouldLog: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * 创建客户端错误（400）
   */
  static badRequest(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.BAD_REQUEST, details, false);
  }

  /**
   * 创建未授权错误（401）
   */
  static unauthorized(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.UNAUTHORIZED, details, false);
  }

  /**
   * 创建禁止访问错误（403）
   */
  static forbidden(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.FORBIDDEN, details, false);
  }

  /**
   * 创建资源未找到错误（404）
   */
  static notFound(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.NOT_FOUND, details, false);
  }

  /**
   * 创建冲突错误（409）
   */
  static conflict(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.BAD_REQUEST, details, false);
  }

  /**
   * 创建请求超时错误（408）
   */
  static timeout(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.BAD_REQUEST, details, true);
  }

  /**
   * 创建服务器内部错误（500）
   */
  static internal(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.INTERNAL_SERVER_ERROR, details, true);
  }

  /**
   * 创建服务不可用错误（503）
   */
  static unavailable(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.SERVICE_UNAVAILABLE, details, true);
  }

  /**
   * 创建请求过多错误（429）
   */
  static tooManyRequests(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.TOO_MANY_REQUESTS, details, false);
  }

  /**
   * 判断是否为客户端错误（4xx）
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * 判断是否为服务器错误（5xx）
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * 转换为 API 响应格式
   */
  toApiResponse() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }

  /**
   * 创建服务不可用错误（503）
   */
  static serviceUnavailable(code: string, message: string, details?: any) {
    return new AppError(code, message, HTTP_STATUS.SERVICE_UNAVAILABLE, details, true);
  }
}
