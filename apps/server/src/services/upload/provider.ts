import {
  aws,
  backblaze,
  cloudflare,
  custom,
  digitalOcean,
  minio,
  tigris,
  wasabi,
} from '@better-upload/server/clients';

import type { WorkerEnv } from '../../env';
import { getAllSettings } from '../../modules/settings/service';

const FACTORIES = {
  aws,
  backblaze,
  cloudflare,
  custom,
  digitalocean: digitalOcean,
  minio,
  tigris,
  wasabi,
} as const;

export type UploadProvider = keyof typeof FACTORIES;
type Client = ReturnType<typeof aws>;
type ClientConfig = Record<string, unknown>;

const isProvider = (value: string): value is UploadProvider =>
  value in FACTORIES;

function readSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readEnv(env: WorkerEnv, ...keys: (keyof WorkerEnv)[]) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pick(
  settings: Record<string, unknown>,
  env: WorkerEnv,
  settingsKey: string,
  ...envKeys: (keyof WorkerEnv)[]
) {
  return readSetting(settings, settingsKey) ?? readEnv(env, ...envKeys);
}

function stripEmpty(config: ClientConfig): ClientConfig {
  return Object.fromEntries(
    Object.entries(config).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
}

function normalizeCustomEndpoint(config: ClientConfig): ClientConfig {
  const endpoint =
    typeof config.endpoint === 'string' ? config.endpoint.trim() : '';
  if (!endpoint || config.host || config.hostname) return config;

  try {
    return { ...config, host: new URL(endpoint).host };
  } catch {
    return { ...config, host: endpoint.replace(/^https?:\/\//, '') };
  }
}

async function readUploadSettings(env: WorkerEnv) {
  try {
    return await getAllSettings(env);
  } catch {
    return {};
  }
}

function resolveProvider(settings: Record<string, unknown>, env: WorkerEnv) {
  const rawProvider =
    readSetting(settings, 'UPLOAD_PROVIDER') ??
    readEnv(env, 'BETTER_UPLOAD_PROVIDER');
  const provider = rawProvider?.toLowerCase();
  return provider && isProvider(provider) ? provider : 'cloudflare';
}

function resolveBucket(
  provider: UploadProvider,
  settings: Record<string, unknown>,
  env: WorkerEnv,
) {
  return (
    readSetting(settings, 'UPLOAD_BUCKET') ??
    readEnv(
      env,
      `BETTER_UPLOAD_${provider.toUpperCase()}_BUCKET` as keyof WorkerEnv,
      'BETTER_UPLOAD_BUCKET',
      'S3_BUCKET',
    ) ??
    'meme-assets'
  );
}

function buildClientConfig(
  provider: UploadProvider,
  settings: Record<string, unknown>,
  env: WorkerEnv,
): ClientConfig {
  const accessKeyId = pick(
    settings,
    env,
    'UPLOAD_ACCESS_KEY_ID',
    'AWS_ACCESS_KEY_ID',
    'S3_ACCESS_KEY',
  );
  const secretAccessKey = pick(
    settings,
    env,
    'UPLOAD_SECRET_ACCESS_KEY',
    'AWS_SECRET_ACCESS_KEY',
    'S3_SECRET_KEY',
  );
  const region = pick(
    settings,
    env,
    'UPLOAD_REGION',
    'AWS_REGION',
    'S3_REGION',
  );
  const endpoint = pick(
    settings,
    env,
    'UPLOAD_ENDPOINT',
    'AWS_ENDPOINT',
    'S3_ENDPOINT',
  );
  const cloudflareAccountId = readEnv(
    env,
    'BETTER_UPLOAD_CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCOUNT_ID',
  );
  const forcePathStyle =
    settings.UPLOAD_FORCE_PATH_STYLE === true ||
    settings.UPLOAD_FORCE_PATH_STYLE === 'true';

  switch (provider) {
    case 'aws':
      return { accessKeyId, secretAccessKey, region };
    case 'cloudflare':
      return { accountId: cloudflareAccountId, accessKeyId, secretAccessKey };
    case 'backblaze':
      return {
        applicationKeyId: accessKeyId,
        applicationKey: secretAccessKey,
        region,
      };
    case 'digitalocean':
      return { key: accessKeyId, secret: secretAccessKey, region };
    case 'minio':
      return { accessKeyId, secretAccessKey, region, endpoint, forcePathStyle };
    case 'tigris':
      return { accessKeyId, secretAccessKey, endpoint };
    case 'wasabi':
      return { accessKeyId, secretAccessKey, region };
    case 'custom':
      return normalizeCustomEndpoint({
        accessKeyId,
        secretAccessKey,
        region,
        endpoint,
        forcePathStyle,
      });
  }
}

function buildClient(
  provider: UploadProvider,
  settings: Record<string, unknown>,
  env: WorkerEnv,
): Client {
  const factory = FACTORIES[provider] as (config?: ClientConfig) => Client;
  const config = stripEmpty(buildClientConfig(provider, settings, env));
  return factory(Object.keys(config).length > 0 ? config : undefined);
}

export async function resolveUploadTargetForUser(
  env: WorkerEnv,
  _userId: string,
): Promise<{ provider: UploadProvider; bucketName: string; client: Client }> {
  const settings = await readUploadSettings(env);
  const provider = resolveProvider(settings, env);
  const bucketName = resolveBucket(provider, settings, env);

  if (!bucketName) {
    throw new Error(
      `Upload bucket for provider '${provider}' is not configured.`,
    );
  }

  return {
    provider,
    bucketName,
    client: buildClient(provider, settings, env),
  };
}
