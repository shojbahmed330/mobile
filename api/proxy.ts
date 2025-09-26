// This file acts as a serverless function on Vercel to proxy requests
// to the Agora token server, bypassing browser CORS restrictions.

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Add CORS headers for the preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const { searchParams } = new URL(request.url);
  const channelName = searchParams.get('channelName');
  const uid = searchParams.get('uid');

  if (!channelName || !uid) {
    return new Response(JSON.stringify({ error: 'channelName and uid are required' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const tokenServerUrl = `https://agora-nine-swart.vercel.app/api/token?channelName=${channelName}&uid=${uid}`;

  try {
    const tokenResponse = await fetch(tokenServerUrl);

    if (!tokenResponse.ok) {
       const errorText = await tokenResponse.text();
       console.error(`Token server error: ${tokenResponse.status} ${errorText}`);
       return new Response(JSON.stringify({ error: 'Failed to fetch token from upstream server' }), {
         status: tokenResponse.status,
         headers: { 
           'Content-Type': 'application/json',
           'Access-Control-Allow-Origin': '*',
          },
       });
    }

    const data = await tokenResponse.json();

    // Return the response from the token server, adding our own CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow any origin to access this proxy
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error in proxy' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
       },
    });
  }
}