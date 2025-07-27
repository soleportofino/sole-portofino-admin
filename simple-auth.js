// Simple authentication system using localStorage
const ADMIN_EMAIL = 'admin@soleportofino.com';
const ADMIN_PASSWORD = 'Admin123!';

function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        localStorage.setItem('isLoggedIn', 'true');
        window.location.href = '/dashboard.html';
    } else {
        const errorEl = document.getElementById('error-message');
        errorEl.textContent = 'Geçersiz giriş bilgileri';
        errorEl.style.display = 'block';
    }
}

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname;
    
    if (currentPage === '/dashboard.html' && !isLoggedIn) {
        window.location.href = '/';
    } else if (currentPage === '/' && isLoggedIn) {
        window.location.href = '/dashboard.html';
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = '/';
}

// Check auth on page load
checkAuth();