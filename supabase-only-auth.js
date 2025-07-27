// Supabase Only Authentication System
// No fallback, no localStorage auth - pure Supabase

// Global auth state
window.AUTH_STATE = {
    user: null,
    session: null,
    loading: true,
    initialized: false
};

// Debug logging
function log(...args) {
    console.log('[Supabase Auth]', ...args);
}

function logError(...args) {
    console.error('[Supabase Auth Error]', ...args);
}

// Get Supabase client
async function getSupabaseClient() {
    if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.client) {
        return window.SUPABASE_CONFIG.client;
    }

    // Initialize if not ready
    log('Waiting for Supabase client initialization...');
    const client = await window.initializeSupabaseConfig();
    return client;
}

// Sign in function
async function signIn(email, password) {
    log('Attempting sign in...');
    
    try {
        const supabase = await getSupabaseClient();
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            logError('Sign in error:', error);
            
            // Provide user-friendly error messages
            let userMessage = 'Giriş başarısız';
            
            if (error.message.includes('Invalid login credentials')) {
                userMessage = 'Geçersiz email veya şifre';
            } else if (error.message.includes('Email not confirmed')) {
                userMessage = 'Email adresinizi doğrulamanız gerekiyor';
            } else if (error.message.includes('Network')) {
                userMessage = 'İnternet bağlantınızı kontrol edin';
            } else if (error.status === 400) {
                userMessage = 'Giriş bilgilerini kontrol edin';
            }
            
            return { 
                success: false, 
                error: userMessage,
                details: error.message 
            };
        }

        log('✅ Sign in successful');
        
        // Update global auth state
        window.AUTH_STATE.user = data.user;
        window.AUTH_STATE.session = data.session;
        
        return { 
            success: true, 
            user: data.user, 
            session: data.session 
        };
        
    } catch (err) {
        logError('Unexpected sign in error:', err);
        return { 
            success: false, 
            error: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
            details: err.message 
        };
    }
}

// Sign out function
async function signOut() {
    log('Signing out...');
    
    try {
        const supabase = await getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            logError('Sign out error:', error);
            // Continue with local cleanup even if server sign out fails
        }
        
        // Clear auth state
        window.AUTH_STATE.user = null;
        window.AUTH_STATE.session = null;
        
        log('✅ Sign out successful');
        
        // Redirect to login
        window.location.href = '/';
        return { success: true };
        
    } catch (err) {
        logError('Unexpected sign out error:', err);
        
        // Force redirect even on error
        window.location.href = '/';
        return { success: false, error: err.message };
    }
}

// Get current user
async function getUser() {
    try {
        // First check cached state
        if (window.AUTH_STATE.user && window.AUTH_STATE.session) {
            return window.AUTH_STATE.user;
        }
        
        const supabase = await getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            logError('Get user error:', error);
            return null;
        }
        
        // Update cached state
        window.AUTH_STATE.user = user;
        
        return user;
    } catch (err) {
        logError('Unexpected get user error:', err);
        return null;
    }
}

// Get current session
async function getSession() {
    try {
        // First check cached state
        if (window.AUTH_STATE.session) {
            return window.AUTH_STATE.session;
        }
        
        const supabase = await getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            logError('Get session error:', error);
            return null;
        }
        
        // Update cached state
        window.AUTH_STATE.session = session;
        
        return session;
    } catch (err) {
        logError('Unexpected get session error:', err);
        return null;
    }
}

// Check authentication status
async function checkAuth() {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath === '/' || currentPath === '/index.html' || currentPath === '';
    
    log(`Checking auth for path: ${currentPath}`);
    
    try {
        // Get current session
        const session = await getSession();
        const user = session?.user;
        
        if (!user && !isLoginPage) {
            // Not authenticated and not on login page
            log('No authenticated user, redirecting to login');
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/?redirect=${redirectUrl}`;
            return false;
        } else if (user && isLoginPage) {
            // Authenticated but on login page
            log('User authenticated on login page, redirecting to dashboard');
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect');
            window.location.href = redirect ? decodeURIComponent(redirect) : '/dashboard.html';
            return false;
        }
        
        log('✅ Auth check passed');
        return true;
    } catch (err) {
        logError('Auth check error:', err);
        
        if (!isLoginPage) {
            // On error, redirect to login only if not already there
            window.location.href = '/';
        }
        return false;
    }
}

// Setup auth state listener
async function setupAuthStateListener() {
    try {
        const supabase = await getSupabaseClient();
        
        log('Setting up auth state listener...');
        
        supabase.auth.onAuthStateChange((event, session) => {
            log('Auth state changed:', event);
            
            // Update global state
            window.AUTH_STATE.session = session;
            window.AUTH_STATE.user = session?.user || null;
            window.AUTH_STATE.loading = false;
            
            const currentPath = window.location.pathname;
            const isLoginPage = currentPath === '/' || currentPath === '/index.html' || currentPath === '';
            
            if (event === 'SIGNED_OUT' && !isLoginPage) {
                log('User signed out, redirecting to login');
                window.location.href = '/';
            } else if (event === 'SIGNED_IN' && isLoginPage) {
                log('User signed in, redirecting to dashboard');
                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                window.location.href = redirect ? decodeURIComponent(redirect) : '/dashboard.html';
            } else if (event === 'TOKEN_REFRESHED') {
                log('Token refreshed successfully');
            } else if (event === 'USER_UPDATED') {
                log('User data updated');
            }
        });
        
        log('✅ Auth state listener setup complete');
        
    } catch (err) {
        logError('Failed to setup auth state listener:', err);
    }
}

// Refresh session if needed
async function refreshSession() {
    try {
        const supabase = await getSupabaseClient();
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (error) {
            logError('Refresh session error:', error);
            return null;
        }
        
        // Update cached state
        window.AUTH_STATE.session = session;
        
        log('✅ Session refreshed');
        return session;
    } catch (err) {
        logError('Unexpected refresh session error:', err);
        return null;
    }
}

// Handle login form submission
async function handleLogin(email, password) {
    const submitButton = document.querySelector('.login-button');
    const buttonText = submitButton?.querySelector('.button-text');
    const buttonLoading = submitButton?.querySelector('.button-loading');
    const errorMessage = document.getElementById('error-message');
    
    // Show loading state
    if (submitButton) {
        submitButton.disabled = true;
        if (buttonText) buttonText.style.display = 'none';
        if (buttonLoading) buttonLoading.style.display = 'inline-block';
    }
    if (errorMessage) {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
    }
    
    try {
        const result = await signIn(email, password);
        
        if (result.success) {
            // Success - auth state listener will handle redirect
            log('Login successful, waiting for redirect...');
        } else {
            // Show error
            if (errorMessage) {
                errorMessage.textContent = result.error || 'Giriş başarısız';
                errorMessage.style.display = 'block';
                
                // Show details in console for debugging
                if (result.details) {
                    console.error('Login error details:', result.details);
                }
            }
            
            // Reset button state
            if (submitButton) {
                submitButton.disabled = false;
                if (buttonText) buttonText.style.display = 'inline';
                if (buttonLoading) buttonLoading.style.display = 'none';
            }
        }
    } catch (err) {
        logError('Handle login error:', err);
        
        // Show error
        if (errorMessage) {
            errorMessage.textContent = 'Beklenmeyen bir hata oluştu';
            errorMessage.style.display = 'block';
        }
        
        // Reset button state
        if (submitButton) {
            submitButton.disabled = false;
            if (buttonText) buttonText.style.display = 'inline';
            if (buttonLoading) buttonLoading.style.display = 'none';
        }
    }
}

// Initialize auth system
async function initializeAuth() {
    if (window.AUTH_STATE.initialized) {
        log('Auth already initialized');
        return;
    }
    
    log('Initializing auth system...');
    
    try {
        // Setup auth state listener
        await setupAuthStateListener();
        
        // Get initial session
        const session = await getSession();
        
        window.AUTH_STATE.initialized = true;
        window.AUTH_STATE.loading = false;
        
        log('✅ Auth system initialized');
        
    } catch (err) {
        logError('Failed to initialize auth:', err);
        window.AUTH_STATE.loading = false;
        throw err;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}

// Export functions
window.supabaseAuth = {
    signIn,
    signOut,
    getUser,
    getSession,
    checkAuth,
    handleLogin,
    refreshSession,
    initializeAuth
};