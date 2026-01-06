import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '../../errors/app-error';
import { handleError, withErrorHandling, createErrorResponse } from '../error-handler';
import type { H3Event } from 'h3';

describe('错误处理工具', () => {
  describe('AppError', () => {
    it('应该正确创建错误实例', () => {
      const error = new AppError('TEST_ERROR', '测试错误', 400, { detail: '详情' });

      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('测试错误');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ detail: '详情' });
    });

    it('应该正确判断错误类型', () => {
      const badRequest = AppError.badRequest('BAD', '坏请求');
      const unauthorized = AppError.unauthorized('UNAUTH', '未授权');
      const notFound = AppError.notFound('NOT_FOUND', '未找到');
      const internal = AppError.internal('INTERNAL', '内部错误');

      expect(badRequest.isClientError()).toBe(true);
      expect(unauthorized.isClientError()).toBe(true);
      expect(notFound.isClientError()).toBe(true);
      expect(internal.isClientError()).toBe(false);
      expect(internal.isServerError()).toBe(true);
    });

    it('应该正确转换为 API 响应', () => {
      const error = new AppError('TEST', '错误', 400, { extra: 'data' });
      const response = error.toApiResponse();

      expect(response).toEqual({
        code: 'TEST',
        message: '错误',
        statusCode: 400,
        details: { extra: 'data' },
      });
    });

    it('应该提供工厂方法', () => {
      expect(AppError.badRequest('CODE', 'msg').statusCode).toBe(400);
      expect(AppError.unauthorized('CODE', 'msg').statusCode).toBe(401);
      expect(AppError.forbidden('CODE', 'msg').statusCode).toBe(403);
      expect(AppError.notFound('CODE', 'msg').statusCode).toBe(404);
      expect(AppError.tooManyRequests('CODE', 'msg').statusCode).toBe(429);
      expect(AppError.internal('CODE', 'msg').statusCode).toBe(500);
      expect(AppError.serviceUnavailable('CODE', 'msg').statusCode).toBe(503);
    });
  });

  describe('handleError', () => {
    it('应该将 AppError 原样返回', () => {
      const appError = AppError.badRequest('TEST', '测试');
      const result = handleError(appError);

      expect(result).toBe(appError);
    });

    it('应该将普通错误转换为 AppError', () => {
      const regularError = new Error('普通错误');
      const result = handleError(regularError);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('普通错误');
      expect(result.statusCode).toBe(500);
    });

    it('应该处理字符串错误', () => {
      const result = handleError('字符串错误');

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('字符串错误');
    });

    it('应该处理未知类型错误', () => {
      const result = handleError(null as any);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('应该保留原始错误的元数据', () => {
      const original = new Error('错误') as any;
      original.code = 'CUSTOM_CODE';
      original.statusCode = 400;

      const result = handleError(original);

      expect(result.code).toBe('CUSTOM_CODE');
      expect(result.statusCode).toBe(400);
    });
  });

  describe('withErrorHandling', () => {
    it('应该成功执行并返回结果', async () => {
      const operation = async () => 'success';
      const result = await withErrorHandling(operation);

      expect(result).toBe('success');
    });

    it('应该捕获错误并返回默认值', async () => {
      const operation = async () => {
        throw new Error('操作失败');
      };

      const result = await withErrorHandling(operation, 'default');

      expect(result).toBe('default');
    });

    it('应该使用自定义错误转换器', async () => {
      const operation = async () => {
        throw new Error('原始错误');
      };

      const customConverter = (error: any) => {
        return AppError.badRequest('CUSTOM', `自定义: ${error.message}`);
      };

      const result = await withErrorHandling(operation, undefined, customConverter);

      expect(result).toBeInstanceOf(AppError);
      expect(result.code).toBe('CUSTOM');
      expect(result.message).toBe('自定义: 原始错误');
    });
  });

  describe('createErrorResponse', () => {
    it('应该正确格式化 AppError', () => {
      const error = AppError.badRequest('VALIDATION_ERROR', '参数错误', { field: 'kw' });
      const response = createErrorResponse(error);

      expect(response).toEqual({
        code: 'VALIDATION_ERROR',
        message: '参数错误',
        data: null,
        error: {
          statusCode: 400,
          details: { field: 'kw' },
        },
      });
    });

    it('应该处理普通 Error', () => {
      const error = new Error('普通错误');
      const response = createErrorResponse(error);

      expect(response.code).toBe('UNKNOWN_ERROR');
      expect(response.message).toBe('普通错误');
      expect(response.error?.statusCode).toBe(500);
    });

    it('应该处理字符串错误', () => {
      const response = createErrorResponse('字符串错误');

      expect(response.code).toBe('UNKNOWN_ERROR');
      expect(response.message).toBe('字符串错误');
    });

    it('应该处理未知错误类型', () => {
      const response = createErrorResponse(null);

      expect(response.code).toBe('UNKNOWN_ERROR');
      expect(response.message).toBe('未知错误');
    });

    it('应该包含可选的额外数据', () => {
      const error = AppError.badRequest('TEST', '错误', { extra: 'data' });
      const response = createErrorResponse(error);

      expect(response.error?.details).toEqual({ extra: 'data' });
    });
  });
});
