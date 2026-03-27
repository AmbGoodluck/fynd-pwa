export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    if (request.method === "PUT" && new URL(request.url).pathname === "/api/upload") {
      const key = new URL(request.url).searchParams.get("key");
      if (!key) {
        return new Response("Missing key", {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
            "Access-Control-Allow-Headers": "*",
          },
        });
      }
      const object = await env.MY_BUCKET.put(key, request.body);
      return new Response(JSON.stringify({ success: true, key }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // Always return CORS headers for all other responses
    return new Response("Not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  },
};
