const API_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiRequestInit = RequestInit & { timeoutMs?: number };

export async function api<T>(
  path: string,
  { timeoutMs = 50_000, ...init }: ApiRequestInit = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers,
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });

    if (response.status === 204) return undefined as T;
    const data = await response.json().catch((error: unknown) => {
      if (timeout.aborted || init.signal?.aborted) throw error;
      return null;
    });

    if (!response.ok) {
      const message = Array.isArray(data?.message)
        ? data.message
            .filter((item: unknown) => typeof item === 'string')
            .join('. ')
        : typeof data?.message === 'string'
          ? data.message
          : null;

      throw new ApiError(
        message ||
          (response.status >= 500
            ? 'The service is temporarily unavailable. Please try again.'
            : `Request failed: ${response.status}`),
        response.status,
      );
    }

    if (data === null) {
      throw new ApiError(
        'The service returned an invalid response. Please try again.',
        502,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError || init.signal?.aborted) throw error;
    throw new ApiError(
      timeout.aborted
        ? 'The service is taking too long to respond. Please try again shortly.'
        : 'Unable to reach the service. Check your connection and try again.',
      timeout.aborted ? 504 : 0,
    );
  }
}

export { API_URL };
