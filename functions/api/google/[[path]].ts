/**
 * Cloudflare Pages Function — GET /api/google/**
 *
 * Catch-all proxy for Google Places API. The API key lives in the Cloudflare
 * environment so it is never shipped in client-side bundles.
 *
 * Examples routed here:
 *   /api/google/place/findplacefromtext/json?input=...
 *   /api/google/place/photo?maxwidth=600&photo_reference=...
 */

interface Env {
  GOOGLE_PLACES_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(context.request.url);

  // Strip the proxy prefix to get the upstream Google API path
  // /api/google/place/findplacefromtext/json → place/findplacefromtext/json
  const googlePath = url.pathname.replace(/^\/api\/google\//, '');
  const googleUrl = new URL(`https://maps.googleapis.com/maps/api/${googlePath}`);

  // Forward all query params except 'key' — key is added server-side
  url.searchParams.forEach((value, key) => {
    if (key !== 'key') googleUrl.searchParams.set(key, value);
  });
  googleUrl.searchParams.set('key', context.env.GOOGLE_PLACES_API_KEY || '');

  // Follow redirects — Place Photo returns 302 to the actual image CDN URL
  const upstream = await fetch(googleUrl.toString(), { redirect: 'follow' });
  const contentType = upstream.headers.get('Content-Type') || 'application/json';

  if (contentType.startsWith('image/')) {
    const imageData = await upstream.arrayBuffer();
    return new Response(imageData, {
      status: upstream.status,
      headers: {
        'Content-Type': contentType,
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const data = await upstream.text();
  return new Response(data, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
