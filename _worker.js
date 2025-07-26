// Cloudflare Pages Worker - Admin Panel
// Simple pass-through worker since we're using direct values

export default {
  async fetch(request, env) {
    // For all requests, return as normal
    return env.ASSETS.fetch(request);
  }
};