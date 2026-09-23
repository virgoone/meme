import type { WorkerEnv } from '../env';
import { exposeCloudflareRuntime } from './runtime';

let appPromise: Promise<typeof import('../server').app> | null = null;
let webServerPromise: Promise<
  typeof import('../../../web/dist/server/server.js').default
> | null = null;
let publicRouteHandlerPromise: Promise<
  typeof import('./public-routes').handlePublicRoute
> | null = null;

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

function loadWebServer() {
  if (!webServerPromise) {
    webServerPromise = import('../../../web/dist/server/server.js').then(
      (module) => module.default,
    );
    webServerPromise.catch(() => {
      webServerPromise = null;
    });
  }
  return webServerPromise;
}

function loadPublicRouteHandler() {
  if (!publicRouteHandlerPromise) {
    publicRouteHandlerPromise = import('./public-routes').then(
      (module) => module.handlePublicRoute,
    );
    publicRouteHandlerPromise.catch(() => {
      publicRouteHandlerPromise = null;
    });
  }
  return publicRouteHandlerPromise;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    exposeCloudflareRuntime(env);

    if (url.pathname.startsWith('/api/auth')) {
      const { getAuth } = await import('../auth');
      return getAuth().handler(request);
    }

    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      const app = await loadApp(env);
      return app.handle(request);
    }

    const publicRouteHandler = await loadPublicRouteHandler();
    const publicRouteResponse = await publicRouteHandler(request, env);
    if (publicRouteResponse) return publicRouteResponse;

    const staticAssetResponse = await tryFetchStaticAsset(request, env);
    if (staticAssetResponse) return staticAssetResponse;

    try {
      const webServer = await loadWebServer();
      return await webServer.fetch(request, env);
    } catch (error) {
      if (env.ASSETS) {
        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) return assetResponse;
      }

      return Response.json(
        {
          error: 'web_render_failed',
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  },
};

async function tryFetchStaticAsset(
  request: Request,
  env: WorkerEnv,
): Promise<Response | null> {
  if (!env.ASSETS) return null;

  const url = new URL(request.url);
  if (!isStaticAssetPath(url.pathname)) return null;

  const clientUrl = new URL(request.url);
  clientUrl.pathname = `/client${url.pathname}`;
  const clientAssetResponse = await env.ASSETS.fetch(
    new Request(clientUrl, request),
  );
  if (clientAssetResponse.status !== 404) return clientAssetResponse;

  const assetResponse = await env.ASSETS.fetch(request);
  return assetResponse.status === 404 ? null : assetResponse;
}

function isStaticAssetPath(pathname: string): boolean {
  return (
    pathname.startsWith('/assets/') ||
    pathname === '/favicon.ico' ||
    pathname === '/apple-touch-icon.png' ||
    pathname === '/site.webmanifest' ||
    pathname.startsWith('/avatars/') ||
    pathname.startsWith('/reactions/') ||
    /\.(?:avif|bmp|css|gif|ico|jpeg|jpg|js|json|map|png|svg|txt|webmanifest|webp|woff2?)$/i.test(
      pathname,
    )
  );
}
