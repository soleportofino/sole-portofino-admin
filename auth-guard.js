// Auth Guard - Optimized authentication middleware
// Prevents redundant auth checks and fixes navigation issues

// Protected and public routes
const PROTECTED_ROUTES = [
    '/dashboard.html',
    '/orders.html',
    '/products.html',
    '/customers.html',
    '/analytics.html',
    '/returns.html',
    '/settings.html'
];

const PUBLIC_ROUTES = [
    '/',
    '/index.html',
    '/login.html'
];

// Auth check cache
const AUTH_CACHE = {
    lastCheck: null,
    isAuthenticated: false,
    user: null,
    cacheTimeout: 5 * 60 * 1000 // 5 minutes
};

// Debug logging
function log(...args) {
    console.log('[Auth Guard]', ...args);
}

// Check if current route is protected
function isProtectedRoute(path = window.location.pathname) {
    const normalizedPath = path === '' ? '/' : path;
    return PROTECTED_ROUTES.some(route => 
        normalizedPath === route || normalizedPath.endsWith(route)
    );
}

// Check if current route is public
function isPublicRoute(path = window.location.pathname) {
    const normalizedPath = path === '' ? '/' : path;
    return PUBLIC_ROUTES.some(route => 
        normalizedPath === route || normalizedPath.endsWith(route)
    );
}

// Check if auth cache is valid
function isCacheValid() {
    if (!AUTH_CACHE.lastCheck) return false;
    
    const now = Date.now();
    const timeSinceLastCheck = now - AUTH_CACHE.lastCheck;
    
    return timeSinceLastCheck < AUTH_CACHE.cacheTimeout;
}

// Clear auth cache
function clearAuthCache() {
    AUTH_CACHE.lastCheck = null;
    AUTH_CACHE.isAuthenticated = false;
    AUTH_CACHE.user = null;
}

// Perform auth check with caching
async function performAuthCheck() {
    // Use cached result if valid
    if (isCacheValid()) {
        log('Using cached auth state');
        return {
            isAuthenticated: AUTH_CACHE.isAuthenticated,
            user: AUTH_CACHE.user
        };
    }
    
    log('Performing fresh auth check...');
    
    try {
        // Wait for auth system to be ready
        if (!window.supabaseAuth) {
            log('Waiting for auth system...');
            let attempts = 0;
            while (!window.supabaseAuth && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }
        
        if (!window.supabaseAuth) {
            throw new Error('Auth system not initialized');
        }
        
        // Get current session
        const session = await window.supabaseAuth.getSession();
        const user = session?.user;
        
        // Update cache
        AUTH_CACHE.lastCheck = Date.now();
        AUTH_CACHE.isAuthenticated = !!user;
        AUTH_CACHE.user = user;
        
        log('Auth check complete:', { isAuthenticated: !!user });
        
        return {
            isAuthenticated: !!user,
            user: user
        };
        
    } catch (error) {
        log('Auth check error:', error);
        clearAuthCache();
        return {
            isAuthenticated: false,
            user: null,
            error: error
        };
    }
}

// Guard protected routes
async function guardRoute() {
    const currentPath = window.location.pathname;
    const isProtected = isProtectedRoute(currentPath);
    const isPublic = isPublicRoute(currentPath);
    
    log(`Guarding route: ${currentPath} (Protected: ${isProtected}, Public: ${isPublic})`);
    
    // Skip auth check for public routes unless user is already authenticated
    if (isPublic && !AUTH_CACHE.isAuthenticated) {
        log('Public route, skipping auth check');
        return true;
    }
    
    try {
        const { isAuthenticated, user } = await performAuthCheck();
        
        // Handle unauthenticated access to protected routes
        if (isProtected && !isAuthenticated) {
            log('Unauthenticated access to protected route, redirecting to login');
            const redirectUrl = encodeURIComponent(currentPath + window.location.search);
            window.location.href = `/?redirect=${redirectUrl}`;
            return false;
        }
        
        // Handle authenticated user on login page
        if (isPublic && isAuthenticated && currentPath !== '/') {
            log('Authenticated user on login page, redirecting to dashboard');
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            window.location.href = redirect ? decodeURIComponent(redirect) : '/dashboard.html';
            return false;
        }
        
        // Update UI for authenticated users
        if (isAuthenticated && user) {
            updateAuthenticatedUI(user);
        }
        
        return true;
        
    } catch (error) {
        log('Route guard error:', error);
        
        // On error, only redirect if on protected route
        if (isProtected) {
            window.location.href = '/';
            return false;
        }
        
        return true;
    }
}

// Update UI for authenticated users
function updateAuthenticatedUI(user) {
    try {
        // Update user email display
        const userEmailEl = document.getElementById('user-email');
        if (userEmailEl) {
            userEmailEl.textContent = user.email || 'Admin';
        }
        
        // Show user info
        const userInfoEl = document.querySelector('.user-info');
        if (userInfoEl) {
            userInfoEl.style.display = 'flex';
        }
        
        // Setup logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton && !logoutButton.hasAttribute('data-listener-attached')) {
            logoutButton.setAttribute('data-listener-attached', 'true');
            logoutButton.addEventListener('click', handleLogout);
        }
        
    } catch (error) {
        console.error('Error updating UI:', error);
    }
}

// Handle logout
async function handleLogout(e) {
    if (e) e.preventDefault();
    
    log('Handling logout...');
    
    // Clear cache immediately
    clearAuthCache();
    
    // Perform logout
    if (window.supabaseAuth) {
        await window.supabaseAuth.signOut();
    } else {
        // Fallback redirect
        window.location.href = '/';
    }
}

// Setup navigation interceptor to prevent unnecessary reloads
function setupNavigationInterceptor() {
    // Intercept link clicks
    document.addEventListener('click', async (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;
        
        // Check if navigating between protected routes
        const currentPath = window.location.pathname;
        const targetPath = href;
        
        if (isProtectedRoute(currentPath) && isProtectedRoute(targetPath)) {
            // Both routes are protected and user is already authenticated
            if (AUTH_CACHE.isAuthenticated) {
                log(`Navigation between protected routes: ${currentPath} -> ${targetPath}`);
                // Allow normal navigation without auth check
                return;
            }
        }
    });
}

// Listen for auth state changes
function setupAuthStateSync() {
    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', (e) => {
        if (e.key === 'supabase.auth.token') {
            log('Auth state changed in another tab');
            clearAuthCache();
            guardRoute();
        }
    });
    
    // Listen for custom auth events
    window.addEventListener('auth:logout', () => {
        log('Logout event received');
        clearAuthCache();
    });
    
    window.addEventListener('auth:login', () => {
        log('Login event received');
        clearAuthCache();
    });
}

// Initialize auth guard
async function initializeAuthGuard() {
    log('Initializing auth guard...');
    
    try {
        // Setup event listeners
        setupNavigationInterceptor();
        setupAuthStateSync();
        
        // Guard current route
        await guardRoute();
        
        log('✅ Auth guard initialized');
        
    } catch (error) {
        console.error('Failed to initialize auth guard:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthGuard);
} else {
    initializeAuthGuard();
}

// Export functions
window.authGuard = {
    guardRoute,
    isProtectedRoute,
    isPublicRoute,
    clearAuthCache,
    initializeAuthGuard
};