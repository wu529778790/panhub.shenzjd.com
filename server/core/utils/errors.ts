/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  PARSE_ERROR = "parse_error",
  PLUGIN_ERROR = "plugin_error",
  VALIDATION_ERROR = "validation_error",
  UNKNOWN_ERROR = "unknown_error",
}

/**
 * 错误严重级别
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * 错误详情接口
 */
export interface ErrorDetail {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  source?: string;
  timestamp: number;
}

/**
 * 警告信息接口
 */
export interface WarningInfo {
  type: ErrorType;
  message: string;
  source?: string;
  count: number;
}

/**
 * 分类错误
 */
export function classifyError(error: any, source?: string): ErrorDetail {
  const timestamp = Date.now();

  // 网络错误
  if (
    error?.code === "ECONNREFUSED" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ECONNRESET" ||
    error?.message?.includes("network") ||
    error?.message?.includes("ECONN")
  ) {
    return {
      type: ErrorType.NETWORK_ERROR,
      severity: ErrorSeverity.MEDIUM,
      message: `网络连接失败: ${error.message || "未知错误"}`,
      source,
      timestamp,
    };
  }

  // 超时错误
  if (
    error?.message?.includes("timeout") ||
    error?.message?.includes("超时")
  ) {
    return {
      type: ErrorType.TIMEOUT_ERROR,
      severity: ErrorSeverity.LOW,
      message: `请求超时: ${error.message || "未能在指定时间内完成"}`,
      source,
      timestamp,
    };
  }

  // 解析错误
  if (
    error?.message?.includes("parse") ||
    error?.message?.includes("解析") ||
    error?.name === "SyntaxError"
  ) {
    return {
      type: ErrorType.PARSE_ERROR,
      severity: ErrorSeverity.HIGH,
      message: `数据解析失败: ${error.message || "无法解析响应数据"}`,
      source,
      timestamp,
    };
  }

  // 默认未知错误
  return {
    type: ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity.MEDIUM,
    message: error?.message || "未知错误",
    source,
    timestamp,
  };
}

/**
 * 错误收集器
 */
export class ErrorCollector {
  private errors: Map<string, ErrorDetail[]> = new Map();
  private maxErrorsPerSource = 100;

  record(error: ErrorDetail, source?: string): void {
    const key = source || "global";
    const errors = this.errors.get(key) || [];

    errors.push(error);

    // 限制每个来源的错误数量
    if (errors.length > this.maxErrorsPerSource) {
      errors.shift(); // 移除最旧的错误
    }

    this.errors.set(key, errors);
  }

  getErrors(source?: string): ErrorDetail[] {
    if (source) {
      return this.errors.get(source) || [];
    }

    // 返回所有错误
    const allErrors: ErrorDetail[] = [];
    this.errors.forEach((errors) => {
      allErrors.push(...errors);
    });
    return allErrors;
  }

  getWarnings(): WarningInfo[] {
    const warningMap = new Map<string, WarningInfo>();

    this.errors.forEach((errors) => {
      errors.forEach((error) => {
        const key = `${error.type}:${error.source || "unknown"}`;
        const existing = warningMap.get(key);

        if (existing) {
          existing.count++;
        } else {
          warningMap.set(key, {
            type: error.type,
            message: error.message,
            source: error.source,
            count: 1,
          });
        }
      });
    });

    return Array.from(warningMap.values());
  }

  clear(source?: string): void {
    if (source) {
      this.errors.delete(source);
    } else {
      this.errors.clear();
    }
  }

  hasErrors(): boolean {
    return this.errors.size > 0;
  }
}
