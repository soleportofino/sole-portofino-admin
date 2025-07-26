// Sole Portofino Admin Authentication

let supabase = null;

// Initialize Supabase with environment variables
async function initializeSupabase() {
    // For Cloudflare Pages, environment variables are injected at build time
    // These placeholders will be replaced by Cloudflare
    const SUPABASE_URL = '__SUPABASE_URL__';
    const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
    
    // Check if placeholders were replaced
    if (SUPABASE_URL.includes('__') || SUPABASE_ANON_KEY.includes('__')) {
        console.warn('Environment variables not set. Using demo mode.');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        return false;
    }
}

// Check if user is already logged in
async function checkAuth() {
    if (!supabase) {
        // Demo mode - check localStorage
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        if (isLoggedIn) {
            window.location.href = 'dashboard.html';
        }
        return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // Redirect to dashboard if already logged in
        window.location.href = 'dashboard.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    const isSupabaseReady = await initializeSupabase();
    
    checkAuth();
    
    // Handle login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Show demo login if Supabase is not configured
    if (!isSupabaseReady) {
        addDemoLoginButton();
    }
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
        
        // Attempt to sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
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
    if (error.message.includes('Invalid login credentials')) {
        return 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.';
    } else if (error.message.includes('Email not confirmed')) {
        return 'E-posta adresinizi doğrulamanız gerekiyor.';
    } else if (error.message.includes('Network')) {
        return 'İnternet bağlantınızı kontrol edin.';
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