import { cors } from '@elysiajs/cors';
import { isAllowedOrigin } from '@meme/shared';
import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../cloudflare/runtime';
import { activityModule } from './activity';
import { adminModule } from './admin';
import { categoriesModule, categoryModule } from './categories';
import { commentsModule } from './comments';
import { faviconModule } from './favicon';
import { guestbookModule } from './guestbook';
import { linkPreviewModule } from './link-preview';
import { mediaModule } from './media';
import { newsletterModule, newslettersModule } from './newsletter';
import { newsletterAdminModule } from './newsletter/admin';
import { postsModule } from './posts';
import { projectsModule } from './projects';
import { reactionsModule } from './reactions';
import { adminS3Module, s3Module } from './s3';
import { systemModule } from './system';
import { tagsModule } from './tags';

export const apiModule = new Elysia({ prefix: '/api', aot: false })
  .use(
    cors({
      origin: (request) => {
        const origin = request.headers.get('origin');
        if (!origin) return true;
        return isAllowedOrigin(origin, getCloudflareRuntimeEnv());
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )
  .use(systemModule)
  .use(adminModule)
  .use(postsModule)
  .use(categoriesModule)
  .use(categoryModule)
  .use(tagsModule)
  .use(guestbookModule)
  .use(commentsModule)
  .use(projectsModule)
  .use(newsletterModule)
  .use(newsletterAdminModule)
  .use(newslettersModule)
  .use(reactionsModule)
  .use(activityModule)
  .use(faviconModule)
  .use(linkPreviewModule)
  .use(s3Module)
  .use(adminS3Module)
  .use(mediaModule);
