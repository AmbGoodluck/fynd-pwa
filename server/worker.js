/**
 * Fynd - API Proxy — Cloudflare Worker
 * Proxies OpenAI + Google Places to avoid CORS & key exposure on web.
 * API keys stored as Cloudflare Worker secrets — never in client code.
 */

let currentModel = 'gpt-4o';

// Restrict to known origins only — add your production domain here
const ALLOWED_ORIGINS = [
  'https://app.fyndplaces.com',
  'https://fynd-pwa.pages.dev',
  'https://fynd-app.pages.dev',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all Cloudflare Pages preview deployments (*.pages.dev)
  if (/^https:\/\/[a-z0-9-]+\.(fynd-pwa|fynd-app)\.pages\.dev$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(request) {
  const origin = (request && request.headers.get('Origin')) || '';
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: getCorsHeaders(request) });
    }

    // GET /admin/model
    if (method === 'GET' && url.pathname === '/admin/model') {
      return json({ model: currentModel }, 200, request);
    }

    // POST /admin/model (requires ADMIN_SECRET)
    if (method === 'POST' && url.pathname === '/admin/model') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (!env.ADMIN_SECRET || token !== env.ADMIN_SECRET) {
        return json({ error: 'unauthorized' }, 401, request);
      }
      const body = await request.json().catch(() => ({}));
      if (!body.model) return json({ error: 'model required' }, 400, request);
      currentModel = body.model;
      return json({ model: currentModel }, 200, request);
    }

    // ── POST /api/chat — OpenAI proxy ─────────────────────────────────
    if (method === 'POST' && url.pathname === '/api/chat') {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500, request);

      const body = await request.json().catch(() => ({}));
      const outgoing = { ...body, model: body.model || currentModel };

      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(outgoing),
        });
        const data = await r.json();
        return json(data, r.status, request);
      } catch (e) {
        return json({ error: 'proxy error', detail: e.message }, 500, request);
      }
    }

    // ── GET /api/places/textsearch — Google Places text search proxy ───
    if (method === 'GET' && url.pathname === '/api/places/textsearch') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500, request);

      const query = url.searchParams.get('query');
      if (!query) return json({ error: 'query parameter required' }, 400, request);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status, request);
      } catch (e) {
        return json({ error: 'places proxy error', detail: e.message }, 500, request);
      }
    }

    // ── GET /api/places/nearbysearch — Google Places nearby proxy ──────
    if (method === 'GET' && url.pathname === '/api/places/nearbysearch') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500, request);

      const location = url.searchParams.get('location');
      const radius = url.searchParams.get('radius') || '2000';
      const type = url.searchParams.get('type') || 'point_of_interest';
      if (!location) return json({ error: 'location parameter required' }, 400, request);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(location)}&radius=${radius}&type=${encodeURIComponent(type)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status, request);
      } catch (e) {
        return json({ error: 'nearby proxy error', detail: e.message }, 500, request);
      }
    }

    // ── GET /api/places/photo — Google Places photo proxy ─────────────
    if (method === 'GET' && url.pathname === '/api/places/photo') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500, request);

      const photoRef = url.searchParams.get('photo_reference');
      const maxWidth = url.searchParams.get('maxwidth') || '400';
      if (!photoRef) return json({ error: 'photo_reference parameter required' }, 400, request);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoRef)}&key=${placesKey}`;
        const r = await fetch(apiUrl, { redirect: 'follow' });
        const contentType = r.headers.get('content-type') || 'image/jpeg';
        return new Response(r.body, {
          status: r.status,
          headers: { 'Content-Type': contentType, ...getCorsHeaders(request), 'Cache-Control': 'public, max-age=86400' },
        });
      } catch (e) {
        return json({ error: 'photo proxy error', detail: e.message }, 500, request);
      }
    }

    // ── GET /api/places/autocomplete — Places autocomplete proxy ──────
    if (method === 'GET' && url.pathname === '/api/places/autocomplete') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500, request);

      const input = url.searchParams.get('input');
      const types = url.searchParams.get('types') || '(regions)';
      if (!input) return json({ error: 'input parameter required' }, 400, request);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status, request);
      } catch (e) {
        return json({ error: 'autocomplete proxy error', detail: e.message }, 500, request);
      }
    }

    // ── GET /api/places/geocode — reverse geocode proxy ───────────────
    if (method === 'GET' && url.pathname === '/api/places/geocode') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500, request);

      const latlng = url.searchParams.get('latlng');
      if (!latlng) return json({ error: 'latlng parameter required' }, 400, request);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(latlng)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status, request);
      } catch (e) {
        return json({ error: 'geocode proxy error', detail: e.message }, 500, request);
      }
    }

    // ── GET /api/maps/js — Google Maps JS proxy (hides API key on web) ─
    if (method === 'GET' && url.pathname === '/api/maps/js') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500, request);

      const callback = url.searchParams.get('callback') || 'initMap';
      const loading = url.searchParams.get('loading') || 'async';

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/js?key=${placesKey}&callback=${encodeURIComponent(callback)}&loading=${encodeURIComponent(loading)}`;
        const r = await fetch(apiUrl);
        const contentType = r.headers.get('content-type') || 'application/javascript; charset=utf-8';
        return new Response(r.body, {
          status: r.status,
          headers: {
            'Content-Type': contentType,
            ...getCorsHeaders(request),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (e) {
        return json({ error: 'maps js proxy error', detail: e.message }, 500, request);
      }
    }

    // ── PUT /api/upload — R2 upload ─────────────
    if (method === 'PUT' && url.pathname === '/api/upload') {
      if (!env.MY_BUCKET) return json({ error: 'R2 binding not configured' }, 500, request);
      const key = url.searchParams.get('key') || `upload-${Date.now()}`;
      await env.MY_BUCKET.put(key, request.body);
      return json({ success: true, key }, 200, request);
    }

    return json({ error: 'Not found' }, 404, request);
  // Note: Ensure your wrangler.toml includes:
  // [[r2_buckets]]
  // binding = "MY_BUCKET"
  // bucket_name = "fynd-moments"
  },
};
