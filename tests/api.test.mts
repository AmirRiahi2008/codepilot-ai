import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { api, ApiError } from '../apps/web/lib/api';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('API requests use the web origin, carry credentials, and preserve custom headers', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/v1/auth/login');
    assert.equal(init?.credentials, 'include');
    assert.equal(init?.cache, 'no-store');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('X-Request-ID'), 'diagnostic');
    assert.equal(headers.get('Content-Type'), 'application/json');
    return Response.json({ ok: true });
  };
  assert.deepEqual(
    await api('/auth/login', {
      method: 'POST',
      body: '{}',
      headers: new Headers({ 'X-Request-ID': 'diagnostic' }),
    }),
    { ok: true },
  );
});

test('401 responses remain distinguishable from service errors', async () => {
  globalThis.fetch = async () =>
    Response.json({ message: 'Authentication required' }, { status: 401 });
  await assert.rejects(
    api('/auth/me'),
    (error) => error instanceof ApiError && error.status === 401,
  );
});

test('validation message arrays are readable', async () => {
  globalThis.fetch = async () =>
    Response.json(
      { message: ['Email is invalid', 'Password is too short'] },
      { status: 400 },
    );
  await assert.rejects(api('/auth/register'), {
    message: 'Email is invalid. Password is too short',
  });
});

test('HTML gateway errors and invalid JSON are reported as API errors', async () => {
  globalThis.fetch = async () =>
    new Response('<html>Bad gateway</html>', { status: 502 });
  await assert.rejects(
    api('/dashboard'),
    (error) => error instanceof ApiError && error.status === 502,
  );
  globalThis.fetch = async () => new Response('<html>Not the API</html>');
  await assert.rejects(
    api('/dashboard'),
    (error) => error instanceof ApiError && error.status === 502,
  );
});

test('network failures are actionable and do not become authentication errors', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(
    api('/dashboard'),
    (error) => error instanceof ApiError && error.status === 0,
  );
});

test('a slow API is aborted and returns a timeout error', async () => {
  globalThis.fetch = async (_input, init) =>
    new Promise((_resolve, reject) => {
      const keepAlive = setTimeout(
        () => reject(new Error('request was not aborted')),
        1000,
      );
      init?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(keepAlive);
          reject(init.signal?.reason);
        },
        { once: true },
      );
    });
  await assert.rejects(
    api('/dashboard', { timeoutMs: 10 }),
    (error) => error instanceof ApiError && error.status === 504,
  );
});

test('caller cancellation is preserved and empty responses are accepted', async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_input, init) => {
    throw init?.signal?.reason;
  };
  await assert.rejects(api('/dashboard', { signal: controller.signal }), {
    name: 'AbortError',
  });
  globalThis.fetch = async () => new Response(null, { status: 204 });
  assert.equal(await api('/auth/logout', { method: 'POST' }), undefined);
});
