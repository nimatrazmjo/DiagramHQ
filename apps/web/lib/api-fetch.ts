/**
 * Resolves the API base URL for both server-side and client-side requests.
 * Supports Docker internal container networking (http://api:4000) as well as
 * local development (http://localhost:4000).
 */
export function getApiBaseUrl(): string {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
}

/**
 * Universal fetch wrapper for API service endpoints.
 * Automatically tries alternative hostnames (e.g. 'api' inside Docker vs 'localhost' on host)
 * if the primary connection fails with a connection error.
 */
export async function fetchFromApi(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const primaryBase = getApiBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const primaryUrl = `${primaryBase}${normalizedPath}`;

  try {
    return await fetch(primaryUrl, init);
  } catch (err: unknown) {
    // If running in Docker and connecting to localhost failed, or vice versa, attempt fallback
    let fallbackBase: string | null = null;

    if (primaryBase.includes('localhost:4000') || primaryBase.includes('127.0.0.1:4000')) {
      fallbackBase = primaryBase.replace(/localhost|127\.0\.0\.1/, 'api');
    } else if (primaryBase.includes('api:4000')) {
      fallbackBase = primaryBase.replace('api:4000', 'localhost:4000');
    }

    if (fallbackBase) {
      try {
        const fallbackUrl = `${fallbackBase}${normalizedPath}`;
        return await fetch(fallbackUrl, init);
      } catch {
        // Fallback also failed; throw original error
      }
    }

    throw err;
  }
}
