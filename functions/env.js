// Cloudflare Pages Function to serve environment variables securely

export async function onRequest(context) {
  // Get request info
  const origin = context.request.headers.get('Origin');
  const referer = context.request.headers.get('Referer');
  const host = context.request.headers.get('Host');
  
  // Log request info for debugging
  console.log('Function env.js called:', {
    origin,
    referer,
    host,
    url: context.request.url
  });
  
  // Allow requests from:
  // 1. Same origin (no Origin header in GET requests)
  // 2. Cloudflare Pages preview deployments (*.pages.dev)
  // 3. Production domain
  // 4. Localhost for development
  const allowedPatterns = [
    /^https:\/\/admin\.soleportofino\.com/,
    /^https:\/\/.*\.pages\.dev/,
    /^http:\/\/localhost/,
    /^http:\/\/127\.0\.0\.1/
  ];
  
  // Check if request is allowed
  const checkUrl = origin || referer || `https://${host}`;
  const isAllowed = !checkUrl || allowedPatterns.some(pattern => pattern.test(checkUrl));
  
  if (!isAllowed) {
    console.error('Unauthorized request from:', checkUrl);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 403,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Check if environment variables exist
  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_ANON_KEY) {
    console.error('Missing environment variables');
    return new Response(JSON.stringify({ 
      error: 'Environment variables not configured',
      available: {
        SUPABASE_URL: !!context.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!context.env.SUPABASE_ANON_KEY
      }
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Return environment variables
  const env = {
    SUPABASE_URL: context.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: context.env.SUPABASE_ANON_KEY
  };

  return new Response(JSON.stringify(env), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'no-store'
    }
  });
}