import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { proxyApi } from '../apps/web/lib/api-proxy';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
beforeEach(() => {
  process.env.API_ORIGIN = 'https://api.example.test/';
  delete process.env.NEXT_PUBLIC_API_URL;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ['API_ORIGIN', 'NEXT_PUBLIC_API_URL', 'NODE_ENV']) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test('gateway forwards the request body, query and session without caching', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      'https://api.example.test/api/v1/auth/login?source=web',
    );
    assert.equal(init?.method, 'POST');
    assert.equal(init?.redirect, 'manual');
    assert.equal(init?.cache, 'no-store');
    assert.equal(
      new Headers(init?.headers).get('cookie'),
      'codepilot_session=test',
    );
    assert.equal(
      new TextDecoder().decode(init?.body as ArrayBuffer),
      '{"email":"a@example.test"}',
    );
    return Response.json({ ok: true });
  };
  const response = await proxyApi(
    new Request('https://web.example.test/api/v1/auth/login?source=web', {
      method: 'POST',
      headers: {
        Origin: 'https://web.example.test',
        Cookie: 'codepilot_session=test',
      },
      body: '{"email":"a@example.test"}',
    }),
    ['auth', 'login'],
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('login and logout cookies belong to the web origin and retain HttpOnly and expiry', async () => {
  globalThis.fetch = async () => {
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      'codepilot_session=token; Path=/; Domain=api.example.test; HttpOnly; Secure; SameSite=None',
    );
    headers.append(
      'Set-Cookie',
      'other=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=None',
    );
    return new Response('{}', { headers });
  };
  const response = await proxyApi(
    new Request('https://web.example.test/api/v1/auth/login'),
    ['auth', 'login'],
  );
  const cookies = response.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  assert.match(cookies[0], /HttpOnly/);
  assert.match(cookies[0], /SameSite=Lax/);
  assert.match(cookies[0], /Secure/);
  assert.doesNotMatch(cookies[0], /Domain=|SameSite=None/);
  assert.match(cookies[1], /Expires=Thu, 01 Jan 1970/);
  const local = await proxyApi(
    new Request('http://localhost:3000/api/v1/auth/login'),
    ['auth', 'login'],
  );
  assert.doesNotMatch(local.headers.getSetCookie()[0], /Secure/);
});

test('legacy API URLs normalize the prefix once and OAuth redirects are preserved', async () => {
  delete process.env.API_ORIGIN;
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test/api/v1/';
  globalThis.fetch = async (input) => {
    assert.equal(
      String(input),
      'https://api.example.test/api/v1/github/connect',
    );
    return new Response(null, {
      status: 302,
      headers: {
        Location: 'https://github.com/login/oauth/authorize?state=test',
      },
    });
  };
  const response = await proxyApi(
    new Request('https://web.example.test/api/v1/github/connect'),
    ['github', 'connect'],
  );
  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get('location'),
    'https://github.com/login/oauth/authorize?state=test',
  );
});

test('gateway blocks internal endpoints, traversal and foreign mutation origins', async () => {
  globalThis.fetch = async () => {
    throw new Error('Must not reach the upstream');
  };
  const request = new Request(
    'https://web.example.test/api/v1/internal/audits/test/run',
  );
  assert.equal(
    (await proxyApi(request, ['internal', 'audits', 'test', 'run'])).status,
    404,
  );
  assert.equal(
    (await proxyApi(request, ['auth', '..', 'internal'])).status,
    404,
  );
  const foreign = new Request('https://web.example.test/api/v1/auth/logout', {
    method: 'POST',
    headers: { Origin: 'https://foreign.example.test' },
  });
  assert.equal((await proxyApi(foreign, ['auth', 'logout'])).status, 403);
});

test('gateway compares mutation origins with the public host behind a reverse proxy', async () => {
  globalThis.fetch = async () => Response.json({ ok: true });
  const request = new Request('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: {
      Host: 'web.example.test',
      'X-Forwarded-Proto': 'https',
      Origin: 'https://web.example.test',
    },
    body: '{}',
  });
  assert.equal((await proxyApi(request, ['auth', 'login'])).status, 200);
});

test('missing production configuration, self-proxying and network failure give explicit errors', async () => {
  delete process.env.API_ORIGIN;
  process.env.NODE_ENV = 'production';
  const request = new Request('https://web.example.test/api/v1/health');
  assert.equal((await proxyApi(request, ['health'])).status, 503);
  process.env.API_ORIGIN = 'https://web.example.test';
  assert.equal((await proxyApi(request, ['health'])).status, 503);
  process.env.API_ORIGIN = 'https://api.example.test';
  globalThis.fetch = async () => {
    throw new TypeError('network failure');
  };
  assert.equal((await proxyApi(request, ['health'])).status, 502);
});
