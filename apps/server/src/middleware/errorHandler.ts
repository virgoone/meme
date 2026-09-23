import type Elysia from 'elysia';

import { ErrorCodes, getHttpStatusForErrorCode } from '../constants/errors';
import { ResponseUtil } from '../lib/response';

/** Custom error carrying an HTTP status + business error code (fluxship parity). */
export class AppError extends Error {
  statusCode: number;
  code: number;
  data?: unknown;

  constructor(
    message: string,
    statusCode = 400,
    code: number = ErrorCodes.UNKNOWN_SYSTEM_ERROR,
    data?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }

  static badRequest(
    message = '请求无效',
    code: number = ErrorCodes.VALIDATION_FAILED,
    data?: unknown,
  ) {
    return new AppError(message, getHttpStatusForErrorCode(code), code, data);
  }

  static unauthorized(
    message = '未授权：请先登录',
    code: number = ErrorCodes.AUTH_UNAUTHORIZED,
  ) {
    return new AppError(message, 401, code);
  }

  static forbidden(
    message = '禁止访问：没有权限',
    code: number = ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
  ) {
    return new AppError(message, 403, code);
  }

  static notFound(
    message = '资源不存在',
    code: number = ErrorCodes.RESOURCE_NOT_FOUND,
  ) {
    return new AppError(message, 404, code);
  }

  static internal(
    message = '服务器内部错误',
    code: number = ErrorCodes.UNKNOWN_SYSTEM_ERROR,
  ) {
    return new AppError(message, 500, code);
  }
}

/**
 * Global error middleware: turns AppError / validation / not-found / unknown
 * errors into a consistent `{ code, message, data }` envelope with the right
 * HTTP status. Mirrors fluxship's errorHandler (without evlog/i18n).
 */
export const errorHandler = (app: Elysia) =>
  app.onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return ResponseUtil.build(
        error.data ?? null,
        error.message,
        error.code,
      ).toJSON();
    }

    if (code === 'VALIDATION') {
      set.status = 400;
      return ResponseUtil.error(
        error instanceof Error ? error.message : '参数校验失败',
        ErrorCodes.VALIDATION_FAILED,
      ).toJSON();
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return ResponseUtil.error('资源不存在', ErrorCodes.RESOURCE_NOT_FOUND).toJSON();
    }

    set.status =
      typeof set.status === 'number' && set.status >= 400 ? set.status : 500;
    return ResponseUtil.error(
      error instanceof Error ? error.message : String(error),
      ErrorCodes.UNKNOWN_SYSTEM_ERROR,
    ).toJSON();
  });
