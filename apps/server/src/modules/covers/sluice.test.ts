import { describe, expect, test } from 'bun:test';
import type { WorkerEnv } from '../../env';
import { AppError } from '../../middleware/errorHandler';
import { generateCover, readCoverConfig } from './sluice';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const pngBase64 = btoa(String.fromCharCode(...PNG));

function setup(overrides: Partial<WorkerEnv> = {}) {
  const stored = new Map<string, { bytes: Uint8Array; contentType?: string }>();
  const env = {
    SLUICE_API_BASE_URL: 'https://sluice.example/v1/',
    SLUICE_API_KEY: 'sk-server-only',
    SLUICE_IMAGE_MODEL: 'gpt-image-2',
    MEDIA_BUCKET: {
      put: async (key: string, body: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => {
        stored.set(key, { bytes: body, contentType: options?.httpMetadata?.contentType });
        return { key, size: body.byteLength, etag: 'e', uploaded: new Date() };
      },
    },
    ...overrides,
  } as unknown as WorkerEnv;
  return { env, stored };
}

function sluiceReturning(status: number, body: unknown, calls: { url: string; init?: RequestInit }[] = []) {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

describe('Sluice cover generation', () => {
  test('sends the prompt to Sluice with the server-side key and stores the image in media storage', async () => {
    const { env, stored } = setup();
    const calls: { url: string; init?: RequestInit }[] = [];
    const cover = await generateCover(env, { prompt: '  A quiet harbor at dawn ', aspectRatio: '3:2', requestId: 'click_12345678' },
      sluiceReturning(200, { data: [{ b64_json: pngBase64, revised_prompt: 'harbor' }], size: '1536x1024', output_format: 'png' }, calls));

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://sluice.example/v1/images/generations');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer sk-server-only');
    expect(headers['idempotency-key']).toBe('meme-cover-click_12345678');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ model: 'gpt-image-2', prompt: 'A quiet harbor at dawn', n: 1, size: '2K', aspect_ratio: '3:2', response_format: 'b64_json' });

    expect(cover.url).toBe(`/api/media/object/${cover.key}`);
    expect(cover.key).toMatch(/^meme-uploads\/admin\/covers\/[\w-]{12}\.png$/);
    expect(cover).toMatchObject({ contentType: 'image/png', size: '1536x1024', aspectRatio: '3:2', revisedPrompt: 'harbor' });
    expect(stored.get(cover.key)?.bytes).toEqual(PNG);
    expect(JSON.stringify(cover)).not.toContain('sk-server-only');
  });

  test('requests compressed WebP when configured and serves it with the matching MIME type', async () => {
    const { env } = setup({ SLUICE_IMAGE_OUTPUT_FORMAT: 'webp' });
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher = sluiceReturning(200, { data: [{ b64_json: btoa('RIFF0000WEBP') }], output_format: 'webp' }, calls);
    const result = await generateCover(env, { prompt: 'cover' }, fetcher);
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({ output_format: 'webp', output_compression: 82 });
    expect(result.contentType).toBe('image/webp');
    expect(result.key.endsWith('.webp')).toBe(true);
  });

  test('writes downloaded covers into the bucket behind the public R2 domain', async () => {
    const publicStorage = setup();
    const { env, stored } = setup({ PUBLIC_MEDIA_BUCKET: publicStorage.env.MEDIA_BUCKET, S3_URL_BASE: 'https://media.example/' });
    const fetcher = (async (url: string | URL | Request) => String(url).includes('/images/generations')
      ? new Response(JSON.stringify({ data: [{ url: 'https://bucket.example/signed.png' }] }))
      : new Response(PNG)) as typeof fetch;
    const cover = await generateCover(env, { prompt: 'x' }, fetcher);
    expect(cover.url).toBe(`https://media.example/${cover.key}`);
    expect(publicStorage.stored.has(cover.key)).toBe(true);
    expect(cover.aspectRatio).toBe('16:9');
    expect(stored.size).toBe(0);
  });

  test('upstream failures, timeouts and non-images store nothing and report a readable error', async () => {
    const cases: [typeof fetch, RegExp][] = [
      [sluiceReturning(400, { error: { message: 'aspect_ratio 21:9 is not supported', code: 'invalid_value' } }), /21:9 is not supported/],
      [sluiceReturning(502, { error: { message: 'image_generation_failed' } }), /Sluice 生成失败/],
      [sluiceReturning(200, { data: [] }), /没有返回图片/],
      [sluiceReturning(200, { data: [{ b64_json: btoa('not an image') }] }), /不是 PNG/],
      [(async () => { throw Object.assign(new Error('timeout'), { name: 'TimeoutError' }); }) as unknown as typeof fetch, /超时，原封面未改变/],
    ];
    for (const [fetcher, message] of cases) {
      const { env, stored } = setup();
      const error = await generateCover(env, { prompt: 'x' }, fetcher).catch((caught) => caught);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toMatch(message);
      expect(stored.size).toBe(0);
    }
  });

  test('refuses to call anything without configuration or a prompt, and validates the ratio', async () => {
    let called = false;
    const fetcher = (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch;
    const missing = setup({ SLUICE_API_KEY: '' });
    expect(readCoverConfig(missing.env).configured).toBe(false);
    expect((await generateCover(missing.env, { prompt: 'x' }, fetcher).catch((error) => error)).statusCode).toBe(503);
    const { env } = setup();
    expect((await generateCover(env, { prompt: '   ' }, fetcher).catch((error) => error)).statusCode).toBe(400);
    expect((await generateCover(env, { prompt: 'x', aspectRatio: '9:99' }, fetcher).catch((error) => error)).statusCode).toBe(400);
    expect(called).toBe(false);
    expect(readCoverConfig(env)).toMatchObject({ configured: true, model: 'gpt-image-2', size: '2K', defaultAspectRatio: '16:9' });
  });
});
