// Cloudflare Pages Worker - Admin Panel
// Injects environment variables into JavaScript files

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle JavaScript files to inject environment variables
    if (url.pathname.endsWith('.js')) {
      const response = await env.ASSETS.fetch(request);
      let content = await response.text();
      
      // Replace placeholders with actual environment variables
      if (env.SUPABASE_URL) {
        content = content.replace(/__SUPABASE_URL__/g, env.SUPABASE_URL);
      }
      if (env.SUPABASE_ANON_KEY) {
        content = content.replace(/__SUPABASE_ANON_KEY__/g, env.SUPABASE_ANON_KEY);
      }
      
      return new Response(content, {
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // For all other requests, return as normal
    return env.ASSETS.fetch(request);
  }
};