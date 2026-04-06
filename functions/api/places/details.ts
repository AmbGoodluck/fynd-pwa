/**
 * Cloudflare Pages Function — GET /api/places/details
 *
 * Proxies a Google Places Details request server-side so the API key is
 * never exposed in client-side code.
 *
 * Query params:
 *   place_id   (required) — Google Places place_id
 *   fields     (optional) — comma-separated field mask (defaults to full set)
 */

interface Env {
  GOOGLE_PLACES_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DEFAULT_FIELDS = [
  'name',
  'formatted_address',
  'geometry',
  'opening_hours',
  'formatted_phone_number',
  'website',
  'rating',
  'price_level',
  'photos',
  'editorial_summary',
  'types',
  'business_status',
  'url',
].join(',');

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get('place_id');
  const fields = searchParams.get('fields') || DEFAULT_FIELDS;

  if (!placeId) {
    return Response.json(
      { error: 'Missing place_id parameter' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'Server configuration error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=${encodeURIComponent(fields)}` +
    `&key=${apiKey}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'FyndApp/1.0' },
    });
    const data = await upstream.json() as Record<string, unknown>;

    return Response.json(data, {
      status: upstream.ok ? 200 : upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      { error: `Upstream request failed: ${message}` },
      { status: 502, headers: CORS_HEADERS }
    );
  }
};
