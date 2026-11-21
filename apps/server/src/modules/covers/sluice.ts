import { nanoid } from 'nanoid';

import { putMediaObject } from '../../cloudflare/r2';
import type { WorkerEnv } from '../../env';
import { AppError } from '../../middleware/errorHandler';

/**
 * Article covers are generated only through Sluice's OpenAI-compatible
 * `POST /v1/images/generations`. The API key stays in the Worker; the browser
 * only sees the stored image URL. Nothing here touches a post: the editor
 * shows the result as a candidate and the cover changes only when the author
 * adopts it and saves the article.
 */
export const COVER_ASPECT_RATIOS = ['16:9', '3:2', '4:3', '1:1', '21:9'] as const;
export type CoverAspectRatio = (typeof COVER_ASPECT_RATIOS)[number];

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_PROMPT_LENGTH = 4000;

export type CoverConfig = {
  configured: boolean;
  model: string | null;
  size: string;
  aspectRatios: readonly CoverAspectRatio[];
  defaultAspectRatio: CoverAspectRatio;
};

export type GeneratedCover = {
  url: string;
  key: string;
  contentType: string;
  bytes: number;
  model: string;
  aspectRatio: CoverAspectRatio;
  size: string | null;
  prompt: string;
  revisedPrompt: string | null;
};

export function readCoverConfig(env: WorkerEnv): CoverConfig {
  const configured = !!(env.SLUICE_API_BASE_URL?.trim() && env.SLUICE_API_KEY?.trim() && env.SLUICE_IMAGE_MODEL?.trim());
  return {
    configured,
    model: env.SLUICE_IMAGE_MODEL?.trim() || null,
    size: env.SLUICE_IMAGE_SIZE?.trim() || '2K',
    aspectRatios: COVER_ASPECT_RATIOS,
    defaultAspectRatio: parseAspectRatio(env.SLUICE_IMAGE_ASPECT_RATIO) ?? '16:9',
  };
}

export async function generateCover(
  env: WorkerEnv,
  input: { prompt?: unknown; aspectRatio?: unknown; requestId?: unknown },
  fetcher: typeof fetch = fetch,
): Promise<GeneratedCover> {
  const config = readCoverConfig(env);
  if (!config.configured || !config.model) {
    throw new AppError('封面生成未配置：请在 Worker 设置 SLUICE_API_BASE_URL、SLUICE_API_KEY 和 SLUICE_IMAGE_MODEL', 503);
  }
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) throw AppError.badRequest('请输入封面描述');
  if (prompt.length > MAX_PROMPT_LENGTH) throw AppError.badRequest(`封面描述不能超过 ${MAX_PROMPT_LENGTH} 个字符`);
  const aspectRatio = input.aspectRatio === undefined ? config.defaultAspectRatio : parseAspectRatio(input.aspectRatio);
  if (!aspectRatio) throw AppError.badRequest(`画幅只能是 ${COVER_ASPECT_RATIOS.join('、')}`);

  const baseUrl = env.SLUICE_API_BASE_URL?.trim() ?? '';
  const apiKey = env.SLUICE_API_KEY?.trim() ?? '';
  const requestId = typeof input.requestId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(input.requestId) ? input.requestId : null;
  const endpoint = `${baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1/images/generations`;
  const timeout = AbortSignal.timeout(Number(env.SLUICE_TIMEOUT_MS) > 0 ? Number(env.SLUICE_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
        // The editor sends one request ID per Generate click, so a retried request
        // reattaches to the same Sluice task instead of being charged twice.
        ...(requestId ? { 'idempotency-key': `meme-cover-${requestId}` } : {}),
      },
      body: JSON.stringify({ model: config.model, prompt, n: 1, size: config.size, aspect_ratio: aspectRatio, response_format: 'b64_json' }),
      signal: timeout,
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    throw new AppError(timedOut ? 'Sluice 生成超时，原封面未改变，请稍后重试' : 'Sluice 无法连接，原封面未改变', 502);
  }

  const text = await response.text();
  let payload: SluiceImagesResponse | null = null;
  try {
    payload = JSON.parse(text) as SluiceImagesResponse;
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const message = payload?.error?.message?.slice(0, 300) || `HTTP ${response.status}`;
    throw new AppError(`Sluice 生成失败：${message}`, response.status === 400 || response.status === 422 ? 400 : 502);
  }
  const image = payload?.data?.[0];
  if (!image) throw new AppError('Sluice 没有返回图片，原封面未改变', 502);

  const { bytes, contentType } = image.b64_json
    ? decodeBase64Image(image.b64_json, payload?.output_format)
    : image.url
      ? await downloadImage(image.url, fetcher)
      : (() => { throw new AppError('Sluice 返回的图片缺少数据', 502); })();
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new AppError('生成的图片过大', 502);

  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1] ?? 'png';
  const key = `meme-uploads/admin/covers/${nanoid(12)}.${extension}`;
  await putMediaObject(env.MEDIA_BUCKET, key, bytes, { contentType });
  const base = (env.S3_URL_BASE?.trim() || '/api/media/object').replace(/\/+$/, '');
  return {
    url: `${base}/${key}`,
    key,
    contentType,
    bytes: bytes.byteLength,
    model: config.model,
    aspectRatio,
    size: payload?.size ?? null,
    prompt,
    revisedPrompt: image.revised_prompt ?? null,
  };
}

type SluiceImagesResponse = {
  data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>;
  output_format?: string;
  size?: string;
  error?: { message?: string; code?: string };
};

function parseAspectRatio(value: unknown): CoverAspectRatio | null {
  return typeof value === 'string' && (COVER_ASPECT_RATIOS as readonly string[]).includes(value.trim()) ? value.trim() as CoverAspectRatio : null;
}

function decodeBase64Image(value: string, format?: string) {
  let binary: string;
  try {
    binary = atob(value.replace(/^data:[^,]*,/, ''));
  } catch {
    throw new AppError('Sluice 返回的图片数据无效', 502);
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  const contentType = sniffImageType(bytes);
  if (!contentType) throw new AppError(`Sluice 返回的 ${format ?? '文件'} 不是 PNG、JPEG 或 WebP 图片`, 502);
  return { bytes, contentType };
}

async function downloadImage(url: string, fetcher: typeof fetch) {
  if (!/^https:\/\//i.test(url)) throw new AppError('Sluice 返回的图片地址无效', 502);
  const response = await fetcher(url, { signal: AbortSignal.timeout(60_000) }).catch(() => null);
  if (!response?.ok) throw new AppError('无法下载 Sluice 生成的图片，原封面未改变', 502);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = sniffImageType(bytes);
  if (!contentType) throw new AppError('Sluice 返回的文件不是图片', 502);
  return { bytes, contentType };
}

function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}
