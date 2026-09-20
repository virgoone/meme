/**
 * Consistent API envelope (mirrors fluxship's ResponseUtil).
 * Serializes to `{ code, message, data }`. `code` 0 means success.
 */
export class ResponseUtil<T = unknown> {
  constructor(
    public readonly code: number,
    public readonly message: string,
    public readonly data: T | null,
  ) {}

  static build<T>(data: T | null, message = 'ok', code = 0): ResponseUtil<T> {
    return new ResponseUtil(code, message, data);
  }

  static success<T>(data: T | null, message = 'ok'): ResponseUtil<T> {
    return new ResponseUtil(0, message, data);
  }

  static error(message: string, code = 5000): ResponseUtil<null> {
    return new ResponseUtil(code, message, null);
  }

  toJSON() {
    return { code: this.code, message: this.message, data: this.data };
  }
}
