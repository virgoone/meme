import { describe, expect, mock, test } from 'bun:test';
import { Elysia } from 'elysia';
import { errorHandler } from '../../middleware/errorHandler';

let role: string | null = null;
mock.module('../../auth', () => ({
  getAuth: () => ({ api: { getSession: async () => role ? { user: { id: 'test', role }, session: {} } : null } }),
}));

const { projectsModule } = await import('./index');
const app = new Elysia({ aot: false }).use(errorHandler).use(projectsModule);

describe('project write authorization', () => {
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    for (const sessionRole of [null, 'user']) {
      test(`${method} rejects ${sessionRole ?? 'anonymous'} before accessing data`, async () => {
        role = sessionRole;
        const path = method === 'POST' ? '/projects/' : '/projects/1';
        const response = await app.handle(new Request(`http://localhost${path}`, {
          method,
          ...(method === 'DELETE' ? {} : { headers: { 'content-type': 'application/json' }, body: '{}' }),
        }));
        expect(response.status).toBe(sessionRole ? 403 : 401);
      });
    }
  }
});
