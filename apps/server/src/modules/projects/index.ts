import { Elysia } from 'elysia';

import { getCloudflareRuntimeEnv } from '../../cloudflare/runtime';
import { AuthPlugin } from '../../plugins/auth';
import { clampLimit } from '../shared';
import {
  createProject,
  deleteProject,
  listProjects,
  type ProjectInput,
  updateProject,
} from './service';

export const projectsModule = new Elysia({ prefix: '/projects' })
  .use(AuthPlugin)
  .get('/', ({ query }) =>
    listProjects(getCloudflareRuntimeEnv(), clampLimit(query.limit, 200)),
  )
  .post('/', ({ body }) =>
    createProject(getCloudflareRuntimeEnv(), body as ProjectInput),
    { admin: true },
  )
  .patch('/:id', async ({ params, body, set }) => {
    const project = await updateProject(
      getCloudflareRuntimeEnv(),
      params.id,
      body as ProjectInput,
    );
    if (!project) {
      set.status = 404;
      return { error: 'not_found' };
    }
    return project;
  }, { admin: true })
  .put('/:id', async ({ params, body, set }) => {
    const project = await updateProject(
      getCloudflareRuntimeEnv(),
      params.id,
      body as ProjectInput,
    );
    if (!project) {
      set.status = 404;
      return { error: 'not_found' };
    }
    return project;
  }, { admin: true })
  .delete('/:id', async ({ params, set }) => {
    const project = await deleteProject(getCloudflareRuntimeEnv(), params.id);
    if (!project) {
      set.status = 404;
      return { error: 'not_found' };
    }
    return project;
  }, { admin: true });
