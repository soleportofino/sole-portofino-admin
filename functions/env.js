// Cloudflare Pages Function to serve environment variables securely

export async function onRequest(context) {
  // Only allow requests from your own domain
  const origin = context.request.headers.get('Origin');
  const allowedOrigins = [
    'https://admin.soleportofino.com',
    'http://localhost:8788' // for local development
  ];
  
  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Unauthorized', { status: 403 });
  }

  // Return environment variables (only non-sensitive ones)
  const env = {
    SUPABASE_URL: context.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: context.env.SUPABASE_ANON_KEY
  };

  return new Response(JSON.stringify(env), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'no-store'
    }
  });
}