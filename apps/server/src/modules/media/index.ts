import { handleRequest, type Router, route } from '@better-upload/server';
import { custom } from '@better-upload/server/clients';
import { Elysia } from 'elysia';
import { nanoid } from 'nanoid';

import {
  getMediaObject,
  headMediaObject,
  putMediaObject,
} from '../../cloudflare/r2';
import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import type { WorkerEnv } from '../../env';
import { AuthPlugin } from '../../plugins/auth';
import { resolveUploadClient } from '../settings/provider';

export const mediaModule = new Elysia({ prefix: '/media' })
  .use(AuthPlugin)
  .post(
    '/upload',
    async ({ request, user }) => {
      const env = getCloudflareRuntimeEnv();
      return handleRequest(request, await createUploadRouter(env, user.id));
    },
    { auth: true, parse: 'none' },
  )
  .put(
    '/object/*',
    async ({ request, params, set }) => {
      const key = params['*'];
      if (!key) {
        set.status = 400;
        return { error: 'missing_key' };
      }
      const env = getCloudflareRuntimeEnv();
      const stored = await putMediaObject(
        env.MEDIA_BUCKET,
        key,
        request.body ?? '',
        {
          contentType: request.headers.get('content-type'),
        },
      );
      return stored;
    },
    { admin: true },
  )
  .get('/object/*', async ({ params, set }) => {
    const key = params['*'];
    if (!key) {
      set.status = 400;
      return { error: 'missing_key' };
    }
    const object = await getMediaObject(
      getCloudflareRuntimeEnv().MEDIA_BUCKET,
      key,
    );
    if (!object) {
      set.status = 404;
      return { error: 'not_found' };
    }
    return new Response(object.body, {
      headers: {
        etag: object.etag,
        ...(object.httpMetadata?.contentType
          ? { 'content-type': object.httpMetadata.contentType }
          : {}),
      },
    });
  })
  .head('/object/*', async ({ params, set }) => {
    const key = params['*'];
    if (!key) {
      set.status = 400;
      return;
    }
    const object = await headMediaObject(
      getCloudflareRuntimeEnv().MEDIA_BUCKET,
      key,
    );
    if (!object) {
      set.status = 404;
      return;
    }
    return new Response(null, {
      headers: {
        etag: object.etag,
        'content-length': object.size.toString(),
        ...(object.httpMetadata?.contentType
          ? { 'content-type': object.httpMetadata.contentType }
          : {}),
      },
    });
  });

async function createUploadRouter(
  env: WorkerEnv,
  userId: string,
): Promise<Router> {
  // Try settings-based provider first; fall back to env-based custom client.
  let client: ReturnType<typeof custom>;
  let bucketName: string;

  try {
    const resolved = await resolveUploadClient(env, userId);
    client = resolved.client as ReturnType<typeof custom>;
    bucketName = resolved.bucketName;
  } catch {
    // Fallback to env-based config
    bucketName = env.S3_BUCKET || 'meme-assets';
    const endpoint = env.S3_ENDPOINT;
    const host = endpoint ? new URL(endpoint).host : '';
    client = custom({
      host,
      accessKeyId: env.S3_ACCESS_KEY || '',
      secretAccessKey: env.S3_SECRET_KEY || '',
      region: env.S3_REGION || 'auto',
      secure: endpoint ? new URL(endpoint).protocol === 'https:' : true,
      forcePathStyle: true,
    });
  }

  return {
    client,
    bucketName,
    routes: {
      commons: route({
        fileTypes: [
          'image/*',
          'video/*',
          'audio/*',
          'application/pdf',
          'text/plain',
        ],
        maxFileSize: 1024 * 1024 * 40,
        multipleFiles: true,
        onBeforeUpload: async () => ({
          generateObjectInfo: ({ file }) => ({
            key: `meme-uploads/${userId}/${nanoid(10)}.${fileExtension(file.name)}`,
            cacheControl: 'public, max-age=31536000',
          }),
        }),
      }),
    },
  };
}

function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || 'bin';
}
