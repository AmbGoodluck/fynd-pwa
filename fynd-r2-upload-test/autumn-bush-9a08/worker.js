const ALLOWED_ORIGINS = [
  "https://app.fyndplaces.com",
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:19006"
];

function getCorsHeaders(request) {
  const origin = request.headers.get("Origin");
  let allowOrigin = "";
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    allowOrigin = origin;
  }
  return {
    "Access-Control-Allow-Origin": allowOrigin || "https://app.fyndplaces.com",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = getCorsHeaders(request);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method === "GET" && url.pathname === "/api/file") {
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response("Missing key", {
          status: 400,
          headers: corsHeaders,
        });
      }
      const object = await env.MY_BUCKET.get(key);
      if (!object) {
        return new Response("Not found", {
          status: 404,
          headers: corsHeaders,
        });
      }
      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(object.body, { headers });
    }

    if (request.method === "PUT" && url.pathname === "/api/upload") {
      const key = url.searchParams.get("key");
      if (!key) {
        return new Response("Missing key", {
          status: 400,
          headers: corsHeaders,
        });
      }
      await env.MY_BUCKET.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get("Content-Type") || "application/octet-stream" },
      });
      return new Response(JSON.stringify({ success: true, key }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Always return CORS headers for all other responses
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
