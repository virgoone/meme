import { handleRequest, type Router, route } from '@better-upload/server';
import { Elysia } from 'elysia';
import { nanoid } from 'nanoid';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin, type SessionUser } from '../../plugins/auth';
import { resolveUploadTargetForUser } from '../../services/upload/provider';

function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() || 'bin';
}

function createUploadRouter(
  target: Awaited<ReturnType<typeof resolveUploadTargetForUser>>,
  user: SessionUser,
  scope: 'user' | 'admin',
): Router {
  const prefix =
    scope === 'admin' ? 'meme-uploads/admin' : `meme-uploads/${user.id}`;

  return {
    client: target.client,
    bucketName: target.bucketName,
    routes: {
      commons: route({
        onBeforeUpload: async () => ({
          generateObjectInfo: ({ file }) => ({
            key: `${prefix}/${nanoid(10)}.${fileExtension(file.name)}`,
            cacheControl: 'public, max-age=31536000',
          }),
        }),
        fileTypes: [
          'image/*',
          'video/*',
          'audio/*',
          'application/pdf',
          'text/plain',
        ],
        multipleFiles: true,
        maxFileSize: 1024 * 1024 * 40,
      }),
    },
  };
}

export const s3Module = new Elysia({ name: 's3', prefix: '/s3' })
  .use(AuthPlugin)
  .post(
    '/upload',
    async ({ request, user }) => {
      const env = getCloudflareRuntimeEnv();
      const target = await resolveUploadTargetForUser(env, user.id);
      return handleRequest(request, createUploadRouter(target, user, 'user'));
    },
    { auth: true, parse: 'none' },
  );

export const adminS3Module = new Elysia({
  name: 'admin-s3',
  prefix: '/admin/s3',
})
  .use(AuthPlugin)
  .post(
    '/upload',
    async ({ request, user }) => {
      const env = getCloudflareRuntimeEnv();
      const target = await resolveUploadTargetForUser(env, user.id);
      return handleRequest(request, createUploadRouter(target, user, 'admin'));
    },
    { admin: true, parse: 'none' },
  );
