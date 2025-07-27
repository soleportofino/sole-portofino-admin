// Sole Portofino Admin - Common Authentication Functions
// This file contains shared authentication functionality used by both login and dashboard pages

// EMERGENCY STOP MECHANISM
(function() {
    const EMERGENCY_STOP = window.location.hash === '#stop';
    if (EMERGENCY_STOP) {
        console.log('🛑 EMERGENCY STOP ACTIVATED - NO REDIRECTS WILL OCCUR');
        window.STOP_ALL_REDIRECTS = true;
    }
})();

console.log('🔵 AUTH-COMMON.JS loaded - Version: 1.3');
console.log('📍 Current URL:', window.location.href);
console.log('📍 Pathname:', window.location.pathname);
console.log('📍 Hostname:', window.location.hostname);
console.log('🛑 Emergency stop active:', window.STOP_ALL_REDIRECTS || false);

let supabase = null;

// Global error handler to prevent page refresh on errors
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    event.preventDefault();
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Initialize Supabase with environment variables
async function initializeSupabase() {
    // For Cloudflare Pages, environment variables are injected at build time
    // These placeholders will be replaced by Cloudflare
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    
    // Log for debugging (remove in production)
    console.log('Supabase URL:', SUPABASE_URL.substring(0, 30) + '...');
    console.log('Supabase Key exists:', SUPABASE_ANON_KEY.length > 0);
    console.log('Environment check:', {
        urlIsPlaceholder: SUPABASE_URL.includes('__'),
        keyIsPlaceholder: SUPABASE_ANON_KEY.includes('__'),
        urlValue: SUPABASE_URL,
        keyLength: SUPABASE_ANON_KEY.length
    });
    
    // Check if placeholders were replaced
    if (SUPABASE_URL.includes('__') || SUPABASE_ANON_KEY.includes('__')) {
        console.warn('Environment variables not set. Using demo mode.');
        return false;
    }
    
    try {
        // Create Supabase client with v2 configuration
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });
        
        // Test connection
        const { data, error } = await supabase.auth.getSession();
        if (error && error.message.includes('NetworkError')) {
            console.error('Network error connecting to Supabase');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Get user-friendly error message
function getErrorMessage(error) {
    console.error('Full error object:', error);
    
    // Check for status code
    if (error.status === 500) {
        return 'Sunucu hatası (500). Lütfen birkaç dakika sonra tekrar deneyin veya Supabase ayarlarını kontrol edin.';
    } else if (error.status === 400) {
        return 'Geçersiz istek. E-posta ve şifrenizi kontrol edin.';
    } else if (error.message && error.message.includes('Invalid login credentials')) {
        return 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.';
    } else if (error.message && error.message.includes('Email not confirmed')) {
        return 'E-posta adresinizi doğrulamanız gerekiyor.';
    } else if (error.message && error.message.includes('Network')) {
        return 'İnternet bağlantınızı kontrol edin.';
    } else if (error.message) {
        return `Hata: ${error.message}`;
    } else {
        return 'Bir hata oluştu. Lütfen tekrar deneyin.';
    }
}

// Export for use in other files
window.supabaseAuth = {
    getSupabase: () => supabase,
    isAuthenticated: async () => {
        if (!supabase) {
            return localStorage.getItem('isLoggedIn') === 'true';
        }
        
        try {
            // First check localStorage for backup tokens
            const storedToken = localStorage.getItem('supabase_auth_token');
            const storedUserId = localStorage.getItem('supabase_user_id');
            
            // Get current session from Supabase
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Error getting session:', error);
                // If there's an error but we have stored tokens, consider authenticated
                return !!(storedToken && storedUserId);
            }
            
            // Update stored tokens if we have a valid session
            if (session) {
                localStorage.setItem('supabase_auth_token', session.access_token);
                localStorage.setItem('supabase_user_id', session.user.id);
                return true;
            }
            
            // If no session but we have stored tokens, try to restore session
            if (storedToken && storedUserId && !session) {
                console.log('Attempting to restore session from stored tokens...');
                // For now, trust the stored tokens
                return true;
            }
            
            // Clear stored tokens if no session
            localStorage.removeItem('supabase_auth_token');
            localStorage.removeItem('supabase_user_id');
            
            return false;
        } catch (error) {
            console.error('Authentication check error:', error);
            // In case of error, check stored tokens
            const storedToken = localStorage.getItem('supabase_auth_token');
            const storedUserId = localStorage.getItem('supabase_user_id');
            return !!(storedToken && storedUserId);
        }
    },
    logout: async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        // Clear all auth-related localStorage items
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('supabase_auth_token');
        localStorage.removeItem('supabase_user_id');
        localStorage.removeItem('rememberMe');
        window.location.href = 'index.html';
    },
    initialize: initializeSupabase,
    getErrorMessage: getErrorMessage
};

// Initialize Supabase when this script loads
(async function() {
    await initializeSupabase();
})();