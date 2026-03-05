/**
 * Fynd - OpenAI Proxy — Cloudflare Worker
 * Replaces the Express server for cloud deployment
 */

let currentModel = 'gpt-4o';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
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

    // POST /api/chat
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

    return json({ error: 'Not found' }, 404);
  },
};
