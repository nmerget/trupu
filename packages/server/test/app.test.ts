import { describe, it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import type { Provider, VerifiedIdentity } from '../src/provider/types.js';

function mockProvider(result?: VerifiedIdentity, error?: string): Provider {
  return {
    async verifyToken() {
      if (error) throw new Error(error);
      return (
        result ?? {
          repository: 'test-org/test-repo',
          workflow: 'publish.yml',
          ref: 'refs/heads/main',
        }
      );
    },
  };
}

const defaultConfig = { devMode: false, devToken: 'test-token' };

function basicAuth(user: string, pass: string): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

describe('GET /healthz', () => {
  it('returns ok', async () => {
    const app = createApp(mockProvider(), defaultConfig);
    const res = await app.request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

describe('GET /auth', () => {
  it('returns 401 without authorization header', async () => {
    const app = createApp(mockProvider(), defaultConfig);
    const res = await app.request('/auth');
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Basic realm="trupu"');
    expect(await res.json()).toEqual({
      error: 'missing authorization header',
    });
  });

  it('returns 401 for unsupported auth scheme', async () => {
    const app = createApp(mockProvider(), defaultConfig);
    const res = await app.request('/auth', {
      headers: { authorization: 'Digest abc' },
    });
    expect(res.status).toBe(401);
  });

  it('authenticates with Bearer token', async () => {
    const app = createApp(mockProvider(), defaultConfig);
    const res = await app.request('/auth', {
      headers: { authorization: 'Bearer some-oidc-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('authenticated');
    expect(body.publisher).toBe('test-org/test-repo:publish.yml');
    expect(res.headers.get('x-trupu-repository')).toBe('test-org/test-repo');
    expect(res.headers.get('x-trupu-workflow')).toBe('publish.yml');
    expect(res.headers.get('x-trupu-ref')).toBe('refs/heads/main');
  });

  it('authenticates with Basic auth (password is the token)', async () => {
    const app = createApp(mockProvider(), defaultConfig);
    const res = await app.request('/auth', {
      headers: { authorization: basicAuth('oauth2', 'my-token') },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('authenticated');
  });

  it('returns 403 when provider rejects token', async () => {
    const app = createApp(
      mockProvider(undefined, 'publisher "bad/repo:hack.yml" is not trusted'),
      defaultConfig,
    );
    const res = await app.request('/auth', {
      headers: { authorization: 'Bearer bad-token' },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'publisher "bad/repo:hack.yml" is not trusted',
    });
  });

  it('reads x-forwarded-authorization header', async () => {
    const app = createApp(mockProvider(), defaultConfig);
    const res = await app.request('/auth', {
      headers: { 'x-forwarded-authorization': 'Bearer forwarded-token' },
    });
    expect(res.status).toBe(200);
  });
});

describe('GET /auth (dev mode)', () => {
  const devConfig = { devMode: true, devToken: 'dev-secret' };

  it('accepts the dev token', async () => {
    const app = createApp(mockProvider(), devConfig);
    const res = await app.request('/auth', {
      headers: { authorization: 'Bearer dev-secret' },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).publisher).toBe('dev/local:dev.yml');
  });

  it('rejects wrong dev token', async () => {
    const app = createApp(mockProvider(), devConfig);
    const res = await app.request('/auth', {
      headers: { authorization: 'Bearer wrong' },
    });
    expect(res.status).toBe(403);
  });

  it('accepts dev token via Basic auth', async () => {
    const app = createApp(mockProvider(), devConfig);
    const res = await app.request('/auth', {
      headers: { authorization: basicAuth('oauth2', 'dev-secret') },
    });
    expect(res.status).toBe(200);
  });
});
