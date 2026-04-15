import { Hono } from 'hono';
import type { Provider } from './provider/types.js';

export interface AppConfig {
  devMode: boolean;
  devToken: string;
}

export function createApp(provider: Provider, appConfig: AppConfig) {
  const app = new Hono();

  app.get('/healthz', (c) => c.json({ status: 'ok' }));

  app.get('/auth', async (c) => {
    const auth =
      c.req.header('authorization') ??
      c.req.header('x-forwarded-authorization');

    if (!auth) {
      c.header('www-authenticate', 'Basic realm="trupu"');
      return c.json({ error: 'missing authorization header' }, 401);
    }

    let token: string;
    if (auth.startsWith('Bearer ')) {
      token = auth.slice(7);
    } else if (auth.startsWith('Basic ')) {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString();
      token = decoded.split(':').slice(1).join(':');
    } else {
      return c.json({ error: 'unsupported authorization scheme' }, 401);
    }

    if (appConfig.devMode) {
      if (token !== appConfig.devToken) {
        return c.json({ error: 'invalid dev token' }, 403);
      }
      c.header('x-trupu-repository', 'dev/local');
      c.header('x-trupu-workflow', 'dev.yml');
      c.header('x-trupu-ref', 'refs/heads/main');
      return c.json({
        status: 'authenticated',
        publisher: 'dev/local:dev.yml',
      });
    }

    try {
      const claims = await provider.verifyToken(token);
      c.header('x-trupu-repository', claims.repository);
      c.header('x-trupu-workflow', claims.workflow);
      c.header('x-trupu-ref', claims.ref);
      return c.json({
        status: 'authenticated',
        publisher: `${claims.repository}:${claims.workflow}`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 403);
    }
  });

  return app;
}
