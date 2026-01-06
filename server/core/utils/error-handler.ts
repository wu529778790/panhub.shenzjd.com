import { AppError } from '../errors/app-error';
import { createLogger } from './logger';
import { ERROR_CODES, HTTP_STATUS } from '../constants';

const logger = createLogger('error-handler');

/**
 * 统一错误处理器
 * 负责记录日志并转换为 AppError
 */
export function handleError(error: unknown): AppError {
  // 已知的 AppError，直接返回
  if (error instanceof AppError) {
    if (error.shouldLog) {
      logger.error(error.message, {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        stack: error.stack,
      });
    }
    return error;
  }

  // Error 实例 - 保留原始错误消息和元数据
  if (error instanceof Error) {
    logger.error('Unexpected error', {
      message: error.message,
      stack: error.stack,
    });
    // 保留原始错误的 code 和 statusCode，如果存在
    const code = (error as any).code || ERROR_CODES.UNKNOWN_ERROR;
    const statusCode = (error as any).statusCode || 500;
    return new AppError(code, error.message, statusCode, undefined, true);
  }

  // 其他类型错误（字符串等）
  logger.error('Unknown error type', { error });
  const errorMessage = typeof error === 'string' ? error : '未知错误';
  return new AppError(ERROR_CODES.UNKNOWN_ERROR, errorMessage, 500, undefined, true);
}

/**
 * 包装异步操作，统一错误处理
 *
 * @param operation 异步操作函数
 * @param defaultValue 默认返回值（失败时返回）
 * @param errorMapping 自定义错误转换器
 * @returns 操作结果或默认值
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  defaultValue?: T,
  errorMapping?: (error: any) => AppError
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    // 如果有自定义错误映射
    if (errorMapping) {
      const mappedError = errorMapping(error);
      // 如果有默认值，返回默认值
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      // 否则返回映射后的错误（不抛出）
      return mappedError as unknown as T;
    }

    // 如果已经是 AppError，直接处理
    if (error instanceof AppError) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw error;
    }

    // 数据库相关错误
    if (error?.code === 'SQLITE_ERROR') {
      logger.error('Database error', { error });
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw AppError.internal(ERROR_CODES.DB_ERROR, '数据库操作失败', {
        originalError: error.message,
      });
    }

    // 网络相关错误
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      logger.error('Network error', { error });
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw AppError.unavailable(ERROR_CODES.SERVICE_UNAVAILABLE, '网络连接失败', {
        originalError: error.message,
      });
    }

    // 其他错误转换为内部错误
    const handledError = handleError(error);
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw handledError;
  }
}

/**
 * 创建错误响应（用于 API 返回）
 */
export function createErrorResponse(error: AppError | Error | string) {
  // 如果是 AppError，使用其属性
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      data: null,
      error: {
        statusCode: error.statusCode,
        details: error.details,
      },
    };
  }

  // 如果是普通 Error
  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
      data: null,
      error: {
        statusCode: 500,
      },
    };
  }

  // 如果是字符串或其他类型
  const message = typeof error === 'string' ? error : '未知错误';
  return {
    code: 'UNKNOWN_ERROR',
    message,
    data: null,
    error: {
      statusCode: 500,
    },
  };
}
