import type { WorkerBindings, WorkerEnv } from '../env';
import { exposeCloudflareRuntime } from './runtime';

let appPromise: Promise<typeof import('../server').app> | null = null;

function loadApp(env: WorkerEnv) {
  exposeCloudflareRuntime(env);
  if (!appPromise) {
    appPromise = import('../server').then((module) => module.app);
    appPromise.catch(() => {
      appPromise = null;
    });
  }
  return appPromise;
}

export default {
  async fetch(request: Request, bindings: WorkerBindings): Promise<Response> {
    const env = exposeCloudflareRuntime(bindings);
    if (env.DATABASE_MIGRATION_READ_ONLY === '1' && new URL(request.url).pathname !== '/api/health') {
      return Response.json({ error: 'database_migration' }, { status: 503, headers: { 'retry-after': '60', 'cache-control': 'no-store' } });
    }
    exposeCloudflareRuntime(env);

    // Better Auth owns /api/auth/* (sign-in, OTP, session, etc.).
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/auth')) {
      const { getAuth } = await import('../auth');
      return getAuth().handler(request);
    }

    const app = await loadApp(env);
    return app.handle(request);
  },
};
