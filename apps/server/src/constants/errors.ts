/**
 * Standard error codes (mirrors fluxship's constants/errors).
 *  1000-1999 auth · 3000-3999 validation · 4000-4999 resource · 5000-5999 system
 */
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 1001,
  AUTH_TOKEN_INVALID: 1003,
  AUTH_INSUFFICIENT_PERMISSIONS: 1004,
  AUTH_UNAUTHORIZED: 1006,
  AUTH_TOKEN_MISSING: 1010,
  VALIDATION_FAILED: 3001,
  RESOURCE_NOT_FOUND: 4001,
  RATE_LIMITED: 4029,
  UNKNOWN_SYSTEM_ERROR: 5000,
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const HTTP_STATUS_BY_CODE: Record<number, number> = {
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,
  [ErrorCodes.AUTH_UNAUTHORIZED]: 401,
  [ErrorCodes.AUTH_TOKEN_MISSING]: 401,
  [ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.VALIDATION_FAILED]: 400,
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.UNKNOWN_SYSTEM_ERROR]: 500,
};

export function getHttpStatusForErrorCode(code: number): number {
  return HTTP_STATUS_BY_CODE[code] ?? 400;
}
