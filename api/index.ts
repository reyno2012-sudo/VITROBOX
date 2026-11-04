import app from '../server';

type VercelRequestLike = {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

/**
 * Vercel rewrites the public OAuth/API URLs to this single function. Restore
 * the original route before handing the request to Express so its existing
 * route table remains the single source of truth.
 */
export default function handler(request: VercelRequestLike, response: unknown) {
  const routeValue = request.query?.route;
  const route = Array.isArray(routeValue) ? routeValue[0] : routeValue;

  if (route) {
    const url = new URL(request.url || '/', 'https://vitrobox.local');
    url.pathname = route.startsWith('/') ? route : `/${route}`;
    url.searchParams.delete('route');
    request.url = `${url.pathname}${url.search}`;
  }

  return app(request as any, response as any);
}
