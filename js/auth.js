// Sole Portofino Admin Authentication

let supabase = null;
let isCheckingAuth = false;

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

// Check if user is already logged in
async function checkAuth() {
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) return;
    isCheckingAuth = true;
    
    try {
        // Only redirect from login page, not from dashboard
        const currentPage = window.location.pathname.toLowerCase();
        const currentFile = window.location.href.split('/').pop().toLowerCase();
        const isLoginPage = currentFile === 'index.html' || currentFile === '' || currentPage === '/' || currentPage === '';
        const isDashboardPage = currentFile.includes('dashboard') || currentPage.includes('dashboard');
        
        console.log('CheckAuth - Current page:', currentPage);
        console.log('CheckAuth - Current file:', currentFile);
        console.log('CheckAuth - Full URL:', window.location.href);
        console.log('Is login page:', isLoginPage);
        console.log('Is dashboard page:', isDashboardPage);
        
        if (!supabase) {
            // Demo mode - check localStorage
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            if (isLoggedIn && isLoginPage) {
                console.log('Demo mode: Redirecting to dashboard');
                window.location.href = 'dashboard.html';
            }
            return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error checking session:', error);
            return;
        }
        
        console.log('Session exists:', !!session);
        
        if (session && isLoginPage) {
            // Only redirect if we're on the login page
            console.log('User authenticated, redirecting to dashboard');
            window.location.href = 'dashboard.html';
        } else if (!session && isDashboardPage) {
            // Redirect to login if not authenticated and on dashboard
            console.log('User not authenticated, redirecting to login');
            window.location.href = 'index.html';
        }
    } finally {
        isCheckingAuth = false;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    const isSupabaseReady = await initializeSupabase();
    
    // Only run checkAuth on login page
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // We're on the login page
        checkAuth();
        loginForm.addEventListener('submit', handleLogin);
        
        // Show demo login if Supabase is not configured
        if (!isSupabaseReady) {
            addDemoLoginButton();
        }
    }
    
    // For dashboard page, let dashboard.js handle its own auth
});

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;
    const remember = form.remember.checked;
    
    const submitButton = form.querySelector('.login-button');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonLoading = submitButton.querySelector('.button-loading');
    const errorMessage = document.getElementById('error-message');
    
    // Show loading state
    submitButton.disabled = true;
    buttonText.style.display = 'none';
    buttonLoading.style.display = 'inline-flex';
    errorMessage.style.display = 'none';
    
    try {
        if (!supabase) {
            // Demo mode login
            if (email === 'admin@soleportofino.com' && password === 'demo123') {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', email);
                localStorage.setItem('loginTime', new Date().toISOString());
                window.location.href = 'dashboard.html';
                return;
            } else {
                throw new Error('Invalid login credentials');
            }
        }
        
        // Log for debugging
        console.log('Attempting login with email:', email);
        
        // Attempt to sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        // Log the full error for debugging
        if (error) {
            console.error('Login error:', error);
            console.error('Error status:', error.status);
            console.error('Error message:', error.message);
            throw error;
        }
        
        // Store remember preference
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberMe');
        }
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        // Show error message
        errorMessage.textContent = getErrorMessage(error);
        errorMessage.style.display = 'block';
        
        // Reset button state
        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        buttonLoading.style.display = 'none';
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

// Add demo login button
function addDemoLoginButton() {
    const form = document.querySelector('.login-form');
    if (form) {
        const demoButton = document.createElement('button');
        demoButton.type = 'button';
        demoButton.className = 'login-button';
        demoButton.style.marginTop = '10px';
        demoButton.style.background = '#6C757D';
        demoButton.textContent = 'Demo Giriş';
        demoButton.onclick = function() {
            document.getElementById('email').value = 'admin@soleportofino.com';
            document.getElementById('password').value = 'demo123';
            form.dispatchEvent(new Event('submit'));
        };
        
        form.appendChild(demoButton);
        
        // Add demo credentials hint
        const hint = document.createElement('p');
        hint.style.textAlign = 'center';
        hint.style.marginTop = '10px';
        hint.style.color = '#6C757D';
        hint.style.fontSize = '12px';
        hint.innerHTML = 'Demo: admin@soleportofino.com / demo123';
        form.appendChild(hint);
    }
}

// Export for use in other files
window.supabaseAuth = {
    getSupabase: () => supabase,
    isAuthenticated: async () => {
        if (!supabase) {
            return localStorage.getItem('isLoggedIn') === 'true';
        }
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    },
    logout: async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        window.location.href = 'index.html';
    }
};