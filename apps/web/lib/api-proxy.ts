const publicRoutes = new Set([
  'auth',
  'github',
  'repositories',
  'dashboard',
  'audits',
  'issues',
  'health',
]);

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
};

function apiBaseUrl() {
  const configured =
    process.env.API_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : '');

  if (!configured) throw new Error('API_ORIGIN is not configured');

  const url = new URL(configured);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error('Invalid API_ORIGIN');
  }
  url.search = '';
  url.hash = '';
  url.pathname = `${url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1/`;
  return url;
}

export async function proxyApi(
  request: Request,
  path: string[],
): Promise<Response> {
  if (
    !publicRoutes.has(path[0]) ||
    path.some((part) => !/^[\w-]+$/.test(part))
  ) {
    return Response.json(
      { message: 'Not found' },
      { status: 404, headers: privateHeaders },
    );
  }

  const incoming = new URL(request.url);
  // Next.js can expose its internal hostname in request.url behind a reverse proxy.
  const host = request.headers.get('host');
  if (host) {
    incoming.port = '';
    incoming.host = host;
  }
  const protocol = request.headers.get('x-forwarded-proto');
  if (protocol === 'http' || protocol === 'https')
    incoming.protocol = `${protocol}:`;
  const origin = request.headers.get('origin');
  if (
    !['GET', 'HEAD'].includes(request.method) &&
    origin &&
    origin !== incoming.origin
  ) {
    return Response.json(
      { message: 'Invalid request origin' },
      { status: 403, headers: privateHeaders },
    );
  }

  let base: URL;
  try {
    base = apiBaseUrl();
  } catch {
    return Response.json(
      {
        message:
          'The API connection is not configured. Please contact the site administrator.',
      },
      { status: 503, headers: privateHeaders },
    );
  }

  if (base.origin === incoming.origin) {
    return Response.json(
      { message: 'Invalid API connection configuration.' },
      {
        status: 503,
        headers: privateHeaders,
      },
    );
  }

  const target = new URL(path.join('/'), base);
  target.search = incoming.search;

  const headers = new Headers({ Accept: 'application/json' });
  for (const name of ['cookie', 'content-type']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const timeout = AbortSignal.timeout(45_000);
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.any([request.signal, timeout]),
    });

    const responseHeaders = new Headers(privateHeaders);
    for (const name of ['content-type', 'location', 'retry-after']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    // Keep sessions on the web origin, without requiring third-party cookies.
    for (const cookie of upstream.headers.getSetCookie()) {
      let value = cookie
        .replace(/;\s*Domain=[^;]*/gi, '')
        .replace(/;\s*SameSite=[^;]*/gi, '')
        .replace(/;\s*Secure\b/gi, '');
      value += '; SameSite=Lax';
      if (incoming.protocol === 'https:') value += '; Secure';
      responseHeaders.append('Set-Cookie', value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        message: timeout.aborted
          ? 'The API is taking too long to respond. Please try again shortly.'
          : 'The API is temporarily unavailable. Please try again.',
      },
      { status: timeout.aborted ? 504 : 502, headers: privateHeaders },
    );
  }
}
