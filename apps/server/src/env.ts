import type { Fetcher, D1Database, R2Bucket, KVNamespace } from "@cloudflare/workers-types";
export type WorkerEnv = {
  ASSETS?: Fetcher;
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
  MEME_KV: KVNamespace;
  APP_ENV?: string;
  DATABASE_PROVIDER?: 'd1' | 'libsql';
  TURSO_DB_URL?: string;
  TURSO_DB_AUTH_TOKEN?: string;
  DATABASE_MIGRATION_READ_ONLY?: string;
  LINK_PREVIEW_API_BASE_URL?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  ADMIN_EMAILS?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_ENDPOINT?: string;
  AWS_REGION?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  BETTER_UPLOAD_BUCKET?: string;
  BETTER_UPLOAD_PROVIDER?: string;
  BETTER_UPLOAD_AWS_BUCKET?: string;
  BETTER_UPLOAD_BACKBLAZE_BUCKET?: string;
  BETTER_UPLOAD_CLOUDFLARE_ACCOUNT_ID?: string;
  BETTER_UPLOAD_CLOUDFLARE_BUCKET?: string;
  BETTER_UPLOAD_CUSTOM_BUCKET?: string;
  BETTER_UPLOAD_DIGITALOCEAN_BUCKET?: string;
  BETTER_UPLOAD_MINIO_BUCKET?: string;
  BETTER_UPLOAD_TIGRIS_BUCKET?: string;
  BETTER_UPLOAD_WASABI_BUCKET?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_R2_ACCOUNT_ID?: string;
  S3_ACCESS_KEY?: string;
  S3_BUCKET?: string;
  S3_ENDPOINT?: string;
  S3_REGION?: string;
  S3_SECRET_KEY?: string;
  S3_URL_BASE?: string;
  SITE_URL?: string;
  /** Sluice gateway base URL, e.g. https://sluice.example.com (with or without /v1). */
  SLUICE_API_BASE_URL?: string;
  /** Sluice API key (Worker secret). Never sent to the browser. */
  SLUICE_API_KEY?: string;
  /** Image model ID served by Sluice, e.g. gpt-image-2 or seedream-5-0-pro. */
  SLUICE_IMAGE_MODEL?: string;
  /** Resolution tier or WxH sent as `size`; default 2K. */
  SLUICE_IMAGE_SIZE?: string;
  SLUICE_IMAGE_OUTPUT_FORMAT?: 'webp';
  /** Default cover aspect ratio; default 16:9. */
  SLUICE_IMAGE_ASPECT_RATIO?: string;
  SLUICE_TIMEOUT_MS?: string;
  TRUSTED_ORIGINS?: string;
};

/** Raw platform bindings; production libSQL has no D1 binding. */
export type WorkerBindings = Omit<WorkerEnv, 'DB'> & { DB?: D1Database };
