# Test Instructions - Redirect Loop Debugging

## Purpose
We've created test pages without any authentication logic to isolate whether the redirect loop is caused by our JavaScript code or the Cloudflare infrastructure.

## Test Pages
1. **Test Login**: https://admin.soleportofino.com/test-index
2. **Test Dashboard**: https://admin.soleportofino.com/test-dashboard

## What to Test

### Scenario 1: Test Pages Work (No Redirect Loop)
If you can access both test pages without any redirect loops, this means:
- The issue is in our JavaScript authentication code
- The Cloudflare infrastructure and _redirects file are working correctly
- We need to debug the auth-common.js, auth-login.js, and dashboard.js files

### Scenario 2: Test Pages Still Have Redirect Loop
If you still get ERR_TOO_MANY_REDIRECTS on test pages, this means:
- The issue is NOT in our JavaScript code
- The problem is in Cloudflare configuration, DNS, or _redirects
- Possible causes:
  - Cloudflare page rules causing loops
  - DNS misconfiguration
  - Worker script interference
  - Cache rules

## Debugging Steps

1. **Clear Everything First**:
   - Clear browser cache and cookies
   - Open Incognito/Private window
   - Try: https://admin.soleportofino.com/test-index

2. **Check Cloudflare Dashboard**:
   - Page Rules: Look for any rules affecting admin.soleportofino.com
   - DNS: Verify CNAME points to sole-portofino-admin.pages.dev
   - Workers: Check if any workers are active on this domain
   - Cache Rules: Look for any custom cache rules

3. **Test Direct Access**:
   - Try the Cloudflare Pages URL directly:
     - https://sole-portofino-admin.pages.dev/test-index
   - If this works but custom domain doesn't, it's a Cloudflare configuration issue

4. **Check Network Tab**:
   - Open browser DevTools → Network tab
   - Preserve log
   - Visit test page
   - Look at the redirect chain to see what's causing the loop

## Quick Fixes to Try

If test pages show redirect loop:

1. **In Cloudflare Dashboard**:
   - Disable "Always Use HTTPS" temporarily
   - Set SSL/TLS mode to "Full (strict)"
   - Disable any Page Rules for admin subdomain
   - Clear Cloudflare cache

2. **DNS Check**:
   - Ensure admin.soleportofino.com CNAME → sole-portofino-admin.pages.dev
   - Make sure proxy (orange cloud) is ON

## Report Back
Please test and let me know:
1. Do test pages work without redirect loops?
2. If not, what does the Network tab show?
3. Any Cloudflare page rules or workers active?