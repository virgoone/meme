import { createLibsqlDatabase } from '@meme/db';
import type { WorkerBindings, WorkerEnv } from '../env';

const environments = new WeakMap<WorkerBindings, WorkerEnv>();

type RuntimeGlobal = typeof globalThis & {
  __memeCloudflareRuntime?: {
    env: WorkerEnv;
    exposedAt: number;
  };
};

export function exposeCloudflareRuntime(bindings: WorkerBindings): WorkerEnv {
  let env = environments.get(bindings);
  if (!env) {
    if (bindings.DATABASE_PROVIDER === 'libsql') {
      if (!bindings.TURSO_DB_URL || !bindings.TURSO_DB_AUTH_TOKEN) throw new Error('libSQL database credentials are required');
      env = { ...bindings, DB: createLibsqlDatabase(bindings.TURSO_DB_URL, bindings.TURSO_DB_AUTH_TOKEN) };
    } else {
      if (!bindings.DB) throw new Error('No database configured');
      env = bindings as WorkerEnv;
    }
    environments.set(bindings, env);
    environments.set(env, env);
  }
  (globalThis as RuntimeGlobal).__memeCloudflareRuntime = {
    env,
    exposedAt: Date.now(),
  };

  if (typeof process !== 'undefined') {
    process.env.CF_WORKER ??= 'true';
    process.env.ELYSIA_AOT ??= 'false';

    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') {
        process.env[key] = value;
      }
    }
  }

  return env;
}

export function getCloudflareRuntimeEnv(): WorkerEnv {
  const env = (globalThis as RuntimeGlobal).__memeCloudflareRuntime?.env;
  if (!env) {
    throw new Error('Cloudflare runtime env has not been exposed');
  }
  return env;
}
