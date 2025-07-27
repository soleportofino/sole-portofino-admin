// Sole Portofino Admin - Login Page Authentication
// This file contains authentication logic specific to the login page

console.log('🟢 AUTH-LOGIN.JS loaded - Version: 1.2');
console.log('📍 Login page URL:', window.location.href);

let isCheckingAuth = false;

// Check if user is already logged in (login page only)
async function checkLoginPageAuth() {
    // Emergency stop check
    if (window.STOP_ALL_REDIRECTS) {
        console.log('🛑 Login auth check skipped - Emergency stop active');
        return;
    }
    
    // Prevent multiple simultaneous auth checks
    if (isCheckingAuth) return;
    isCheckingAuth = true;
    
    try {
        // Check current file to prevent cross-page redirects
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        console.log('Login auth check - Current file:', currentFile);
        
        // If we're on dashboard, don't do login auth check
        if (currentFile.includes('dashboard')) {
            console.log('⚠️ On dashboard page, skipping login auth check');
            isCheckingAuth = false;
            return;
        }
        
        console.log('Login page auth check started');
        
        // Wait for supabaseAuth to be ready
        if (!window.supabaseAuth) {
            console.warn('Waiting for auth module...');
            setTimeout(checkLoginPageAuth, 100);
            return;
        }
        
        const isAuthenticated = await window.supabaseAuth.isAuthenticated();
        console.log('Login page - User authenticated:', isAuthenticated);
        
        if (isAuthenticated) {
            console.log('User already authenticated, redirecting to dashboard');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Login page auth check error:', error);
    } finally {
        isCheckingAuth = false;
    }
}

// Handle login form submission
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
        const supabase = window.supabaseAuth.getSupabase();
        
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
        errorMessage.textContent = window.supabaseAuth.getErrorMessage(error);
        errorMessage.style.display = 'block';
        
        // Reset button state
        submitButton.disabled = false;
        buttonText.style.display = 'inline';
        buttonLoading.style.display = 'none';
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

// Initialize login page
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Login page loaded');
    
    // Check if user is already logged in
    checkLoginPageAuth();
    
    // Setup login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Wait for supabase to be ready and check if demo mode is needed
    setTimeout(() => {
        const supabase = window.supabaseAuth?.getSupabase();
        if (!supabase) {
            console.log('Demo mode active, adding demo login button');
            addDemoLoginButton();
        }
    }, 500);
});