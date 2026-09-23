import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { listCategories } from './service';

function listCategoriesFromQuery(query: {
  page?: string;
  pageSize?: string;
  title?: string;
}) {
  return listCategories(getCloudflareRuntimeEnv(), {
    page: Number(query.page),
    pageSize: Number(query.pageSize),
    title: query.title,
  });
}

export const categoriesModule = new Elysia({ prefix: '/categories' }).get(
  '/',
  ({ query }) => listCategoriesFromQuery(query),
);

export const categoryModule = new Elysia({ prefix: '/category' }).get(
  '/',
  ({ query }) => listCategoriesFromQuery(query),
);
