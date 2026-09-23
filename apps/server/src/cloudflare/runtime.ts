import type { WorkerEnv } from '../env';

type RuntimeGlobal = typeof globalThis & {
  __memeCloudflareRuntime?: {
    env: WorkerEnv;
    exposedAt: number;
  };
};

export function exposeCloudflareRuntime(env: WorkerEnv): WorkerEnv {
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
