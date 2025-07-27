// Supabase Configuration and Environment Setup
// This file handles environment variable fetching and Supabase client initialization

// Global variables
window.SUPABASE_CONFIG = {
    url: null,
    anonKey: null,
    client: null,
    initialized: false,
    error: null
};

// Debug logging
function log(...args) {
    console.log('[Supabase Config]', ...args);
}

function logError(...args) {
    console.error('[Supabase Config Error]', ...args);
}

// Fetch environment variables from Cloudflare Functions endpoint
async function fetchEnvironmentVariables() {
    log('Fetching environment variables...');
    
    try {
        const response = await fetch('/functions/env.js', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const env = await response.json();
        
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            throw new Error('Missing required environment variables');
        }

        // Validate Supabase URL format
        if (!env.SUPABASE_URL.includes('supabase.co')) {
            throw new Error('Invalid Supabase URL format');
        }

        log('✅ Environment variables fetched successfully');
        return {
            url: env.SUPABASE_URL,
            anonKey: env.SUPABASE_ANON_KEY
        };
    } catch (error) {
        logError('Failed to fetch environment variables:', error);
        
        // Try to get from injected placeholders (for _worker.js)
        const placeholderUrl = '__SUPABASE_URL__';
        const placeholderKey = '__SUPABASE_ANON_KEY__';
        
        // Check if _worker.js has replaced the placeholders
        if (window.INJECTED_SUPABASE_URL && window.INJECTED_SUPABASE_URL !== placeholderUrl) {
            log('Using injected environment variables');
            return {
                url: window.INJECTED_SUPABASE_URL,
                anonKey: window.INJECTED_SUPABASE_ANON_KEY
            };
        }

        // Check localStorage cache (for development)
        const cachedUrl = localStorage.getItem('SUPABASE_URL');
        const cachedKey = localStorage.getItem('SUPABASE_ANON_KEY');
        
        if (cachedUrl && cachedKey && cachedUrl.includes('supabase.co')) {
            log('Using cached environment variables');
            return {
                url: cachedUrl,
                anonKey: cachedKey
            };
        }

        throw error;
    }
}

// Prompt user for manual configuration
async function promptForConfiguration() {
    const message = `
⚠️ Supabase yapılandırması bulunamadı!

Lütfen Supabase projenizin bilgilerini girin:
1. Supabase Dashboard'a gidin
2. Settings > API bölümüne gidin
3. URL ve anon key değerlerini kopyalayın

Devam etmek için Tamam'a basın.
    `.trim();

    alert(message);

    const url = prompt('Supabase URL (örn: https://xxxxx.supabase.co):');
    const anonKey = prompt('Supabase Anon Key:');

    if (!url || !anonKey) {
        throw new Error('Supabase yapılandırması iptal edildi');
    }

    if (!url.includes('supabase.co')) {
        throw new Error('Geçersiz Supabase URL formatı');
    }

    // Cache for development
    localStorage.setItem('SUPABASE_URL', url);
    localStorage.setItem('SUPABASE_ANON_KEY', anonKey);

    return { url, anonKey };
}

// Load Supabase client library
async function loadSupabaseLibrary() {
    return new Promise((resolve, reject) => {
        if (window.supabase) {
            resolve();
            return;
        }

        log('Loading Supabase client library...');
        
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.onload = () => {
            log('✅ Supabase library loaded');
            resolve();
        };
        script.onerror = (error) => {
            logError('Failed to load Supabase library:', error);
            reject(new Error('Supabase library yüklenemedi'));
        };
        document.head.appendChild(script);
    });
}

// Initialize Supabase client
async function initializeSupabase(config) {
    if (!window.supabase) {
        throw new Error('Supabase library not loaded');
    }

    log('Creating Supabase client...');
    
    const client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            storage: window.localStorage
        }
    });

    // Test connection
    log('Testing Supabase connection...');
    const { data, error } = await client.auth.getSession();
    
    if (error) {
        throw new Error(`Supabase bağlantı hatası: ${error.message}`);
    }

    log('✅ Supabase client initialized successfully');
    return client;
}

// Main initialization function
async function initializeSupabaseConfig() {
    if (window.SUPABASE_CONFIG.initialized) {
        log('Already initialized');
        return window.SUPABASE_CONFIG.client;
    }

    log('Starting Supabase initialization...');

    try {
        // Step 1: Load Supabase library
        await loadSupabaseLibrary();

        // Step 2: Get environment variables
        let config;
        try {
            config = await fetchEnvironmentVariables();
        } catch (fetchError) {
            logError('Environment fetch failed, prompting for manual config...');
            config = await promptForConfiguration();
        }

        // Step 3: Initialize Supabase client
        const client = await initializeSupabase(config);

        // Step 4: Store in global config
        window.SUPABASE_CONFIG = {
            url: config.url,
            anonKey: config.anonKey,
            client: client,
            initialized: true,
            error: null
        };

        log('✅ Supabase configuration complete');
        return client;

    } catch (error) {
        logError('Initialization failed:', error);
        
        window.SUPABASE_CONFIG.error = error;
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 15px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10000;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <strong>⚠️ Supabase Bağlantı Hatası</strong><br>
            ${error.message}<br>
            <small style="opacity: 0.8">Detaylar için konsolu kontrol edin</small>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 10000);

        throw error;
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Only auto-initialize on login page
        const isLoginPage = window.location.pathname === '/' || 
                          window.location.pathname === '/index.html' ||
                          window.location.pathname === '';
        
        if (isLoginPage) {
            initializeSupabaseConfig().catch(err => {
                logError('Auto-initialization failed:', err);
            });
        }
    });
} else {
    const isLoginPage = window.location.pathname === '/' || 
                      window.location.pathname === '/index.html' ||
                      window.location.pathname === '';
    
    if (isLoginPage) {
        initializeSupabaseConfig().catch(err => {
            logError('Auto-initialization failed:', err);
        });
    }
}

// Export initialization function
window.initializeSupabaseConfig = initializeSupabaseConfig;