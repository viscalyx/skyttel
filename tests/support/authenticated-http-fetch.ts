import type { APIRequestContext } from '@playwright/test';

/** Adapt the browser transport to an authenticated public HTTP client.
 * Every response comes from the real application and SQLite. This replaces
 * only jsdom's missing same-origin transport/cookie jar, never a component or
 * an application response. Layout and native inertness remain Chromium tests.
 */
export function authenticatedHttpFetch(client: APIRequestContext, origin: string): typeof fetch {
  return async (input, init = {}) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? String(input), origin);
    if (url.origin !== origin) throw new Error('HTTP fixture only serves its own application');
    const headers = new Headers(request?.headers);
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
    const method = init.method ?? request?.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') headers.set('origin', origin);
    const body = init.body ?? (request ? await request.text() : undefined);
    if (body !== undefined && body !== null && typeof body !== 'string')
      throw new Error('This HTTP fixture sends JSON/text requests only');
    const response = await client.fetch(url.href, {
      method,
      headers: Object.fromEntries(headers),
      ...(body !== undefined && body !== null ? { data: body } : {}),
    });
    const bytes = await response.body();
    return new Response(bytes.length ? new Uint8Array(bytes) : null, {
      status: response.status(),
      headers: response.headers(),
    });
  };
}
