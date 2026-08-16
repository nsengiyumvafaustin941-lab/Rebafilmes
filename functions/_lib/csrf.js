// functions/_lib/csrf.js
//
// Origin and CSRF validation for state-changing requests (POST, PUT, DELETE, PATCH).

export function validateOrigin(request) {
  const method = request.method.toUpperCase();
  // Safe idempotent methods do not need CSRF Origin checks
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  const requestUrl = new URL(request.url);

  // If Origin header is present (standard on all modern browser POST/PUT/DELETE)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Allow exact host match
      if (originUrl.host === requestUrl.host) return true;
      // Allow localhost and local IP development
      if (
        originUrl.hostname === 'localhost' ||
        originUrl.hostname === '127.0.0.1' ||
        originUrl.hostname.endsWith('.pages.dev') ||
        originUrl.hostname.endsWith('.rebafilme.com')
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  // Fallback: Check Referer header if Origin is omitted
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === requestUrl.host) return true;
      if (
        refererUrl.hostname === 'localhost' ||
        refererUrl.hostname === '127.0.0.1' ||
        refererUrl.hostname.endsWith('.pages.dev') ||
        refererUrl.hostname.endsWith('.rebafilme.com')
      ) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  // If both Origin and Referer are absent (e.g. server-to-server or legacy), allow only if content-type is json
  const contentType = request.headers.get('Content-Type') || '';
  return contentType.includes('application/json');
}
