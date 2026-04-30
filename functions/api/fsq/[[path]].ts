export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  // /api/fsq/places/search?... → https://api.foursquare.com/v3/places/search?...
  const fsqPath = url.pathname.replace('/api/fsq/', '');
  const fsqUrl = `https://api.foursquare.com/v3/${fsqPath}${url.search}`;

  const response = await fetch(fsqUrl, {
    method: context.request.method,
    headers: {
      'Authorization': `Bearer ${context.env.FOURSQUARE_API_KEY}`,
      'Accept': 'application/json',
    },
  });

  const data = await response.text();

  return new Response(data, {
    status: response.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
};
