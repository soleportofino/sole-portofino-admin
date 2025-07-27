// Clear all authentication data
// Use this to fix auto-login issues and clean up old sessions

function clearAllAuth() {
    console.log('🧹 Starting auth cleanup...');
    
    // List all keys to remove
    const keysToRemove = [];
    
    // Find all auth-related keys in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
            key.includes('supabase') || 
            key.includes('SUPABASE') || 
            key.includes('sb-') ||  // Supabase default prefix
            key === 'isLoggedIn' ||
            key === 'authMode' ||
            key === 'userEmail'
        )) {
            keysToRemove.push(key);
        }
    }
    
    // Remove all found keys
    console.log(`Found ${keysToRemove.length} auth-related keys to remove:`, keysToRemove);
    keysToRemove.forEach(key => {
        console.log(`Removing: ${key}`);
        localStorage.removeItem(key);
    });
    
    // Clear session storage
    sessionStorage.clear();
    console.log('✅ Session storage cleared');
    
    // Clear auth cache
    if (window.AUTH_CACHE) {
        window.AUTH_CACHE.lastCheck = null;
        window.AUTH_CACHE.isAuthenticated = false;
        window.AUTH_CACHE.user = null;
        console.log('✅ Auth cache cleared');
    }
    
    // Clear Supabase config
    if (window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG.initialized = false;
        window.SUPABASE_CONFIG.client = null;
        console.log('✅ Supabase config cleared');
    }
    
    console.log('✅ All auth data cleared successfully!');
    console.log('🔄 Reloading page in 2 seconds...');
    
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
}

// Auto-run if called directly
if (typeof window !== 'undefined') {
    // Add to window for console access
    window.clearAllAuth = clearAllAuth;
    
    // Check if should auto-run
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear') === 'true') {
        clearAllAuth();
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { clearAllAuth };
}