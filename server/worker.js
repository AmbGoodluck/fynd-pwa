/**
 * Fynd - API Proxy — Cloudflare Worker
 * Proxies OpenAI + Google Places to avoid CORS & key exposure on web.
 */

let currentModel = 'gpt-4o';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // GET /admin/model
    if (method === 'GET' && url.pathname === '/admin/model') {
      return json({ model: currentModel });
    }

    // POST /admin/model
    if (method === 'POST' && url.pathname === '/admin/model') {
      const body = await request.json().catch(() => ({}));
      if (!body.model) return json({ error: 'model required' }, 400);
      currentModel = body.model;
      return json({ model: currentModel });
    }

    // ── POST /api/chat — OpenAI proxy ─────────────────────────────────
    if (method === 'POST' && url.pathname === '/api/chat') {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

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
        return json(data, r.status);
      } catch (e) {
        return json({ error: 'proxy error', detail: e.message }, 500);
      }
    }

    // ── GET /api/places/textsearch — Google Places text search proxy ───
    if (method === 'GET' && url.pathname === '/api/places/textsearch') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500);

      const query = url.searchParams.get('query');
      if (!query) return json({ error: 'query parameter required' }, 400);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status);
      } catch (e) {
        return json({ error: 'places proxy error', detail: e.message }, 500);
      }
    }

    // ── GET /api/places/nearbysearch — Google Places nearby proxy ──────
    if (method === 'GET' && url.pathname === '/api/places/nearbysearch') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500);

      const location = url.searchParams.get('location');
      const radius = url.searchParams.get('radius') || '2000';
      const type = url.searchParams.get('type') || 'point_of_interest';
      if (!location) return json({ error: 'location parameter required' }, 400);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(location)}&radius=${radius}&type=${encodeURIComponent(type)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status);
      } catch (e) {
        return json({ error: 'nearby proxy error', detail: e.message }, 500);
      }
    }

    // ── GET /api/places/photo — Google Places photo proxy ─────────────
    if (method === 'GET' && url.pathname === '/api/places/photo') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500);

      const photoRef = url.searchParams.get('photo_reference');
      const maxWidth = url.searchParams.get('maxwidth') || '400';
      if (!photoRef) return json({ error: 'photo_reference parameter required' }, 400);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${encodeURIComponent(photoRef)}&key=${placesKey}`;
        const r = await fetch(apiUrl, { redirect: 'follow' });
        // Return the photo binary with the correct content-type
        const contentType = r.headers.get('content-type') || 'image/jpeg';
        return new Response(r.body, {
          status: r.status,
          headers: { 'Content-Type': contentType, ...CORS_HEADERS, 'Cache-Control': 'public, max-age=86400' },
        });
      } catch (e) {
        return json({ error: 'photo proxy error', detail: e.message }, 500);
      }
    }

    // ── GET /api/places/geocode — reverse geocode proxy ───────────────
    if (method === 'GET' && url.pathname === '/api/places/geocode') {
      const placesKey = env.GOOGLE_PLACES_API_KEY;
      if (!placesKey) return json({ error: 'GOOGLE_PLACES_API_KEY not configured' }, 500);

      const latlng = url.searchParams.get('latlng');
      if (!latlng) return json({ error: 'latlng parameter required' }, 400);

      try {
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(latlng)}&key=${placesKey}`;
        const r = await fetch(apiUrl);
        const data = await r.json();
        return json(data, r.status);
      } catch (e) {
        return json({ error: 'geocode proxy error', detail: e.message }, 500);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};
