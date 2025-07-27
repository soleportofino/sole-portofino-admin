// Supabase Configuration and Environment Setup
// This file handles environment variable fetching and Supabase client initialization

// Placeholders for _worker.js injection
const SUPABASE_URL_PLACEHOLDER = '__SUPABASE_URL__';
const SUPABASE_ANON_KEY_PLACEHOLDER = '__SUPABASE_ANON_KEY__';

// Global variables with singleton pattern
window.SUPABASE_CONFIG = {
    url: null,
    anonKey: null,
    client: null,
    initialized: false,
    error: null,
    initPromise: null  // Singleton promise to prevent multiple initializations
};

// Check if debug mode is enabled
const urlParams = new URLSearchParams(window.location.search);
const DEBUG_MODE = urlParams.get('debug') === 'true' || urlParams.get('test') === 'true';

// Debug logging
function log(...args) {
    console.log('[Supabase Config]', ...args);
}

function logError(...args) {
    console.error('[Supabase Config Error]', ...args);
}

function debugLog(...args) {
    if (DEBUG_MODE) {
        console.log('[DEBUG]', ...args);
    }
}

// Fetch environment variables from Cloudflare Functions endpoint
async function fetchEnvironmentVariables() {
    log('Fetching environment variables...');
    
    // Method 1: Check if _worker.js has replaced the placeholders
    debugLog('Checking placeholders:', {
        url: SUPABASE_URL_PLACEHOLDER,
        key: SUPABASE_ANON_KEY_PLACEHOLDER.substring(0, 20) + '...',
        urlReplaced: SUPABASE_URL_PLACEHOLDER !== '__SUPABASE_URL__',
        keyReplaced: SUPABASE_ANON_KEY_PLACEHOLDER !== '__SUPABASE_ANON_KEY__'
    });
    
    if (SUPABASE_URL_PLACEHOLDER !== '__SUPABASE_URL__' && 
        SUPABASE_ANON_KEY_PLACEHOLDER !== '__SUPABASE_ANON_KEY__') {
        log('✅ Using _worker.js injected placeholders');
        return {
            url: SUPABASE_URL_PLACEHOLDER,
            anonKey: SUPABASE_ANON_KEY_PLACEHOLDER
        };
    }
    
    // Method 2: Check window.INJECTED_* variables
    if (window.INJECTED_SUPABASE_URL && window.INJECTED_SUPABASE_ANON_KEY) {
        debugLog('Found window.INJECTED variables:', {
            url: window.INJECTED_SUPABASE_URL,
            key: window.INJECTED_SUPABASE_ANON_KEY.substring(0, 20) + '...'
        });
        log('✅ Using window.INJECTED environment variables');
        return {
            url: window.INJECTED_SUPABASE_URL,
            anonKey: window.INJECTED_SUPABASE_ANON_KEY
        };
    }
    
    // Method 3: Try Cloudflare Functions endpoint
    try {
        // Fix: Use /functions/env instead of /functions/env.js
        const functionUrl = '/functions/env';
        debugLog('Fetching from:', functionUrl);
        
        const response = await fetch(functionUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        debugLog('Function response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const env = await response.json();
        debugLog('Function returned:', {
            hasUrl: !!env.SUPABASE_URL,
            hasKey: !!env.SUPABASE_ANON_KEY
        });
        
        if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
            throw new Error('Missing required environment variables in function response');
        }

        // Validate Supabase URL format
        if (!env.SUPABASE_URL.includes('supabase.co')) {
            throw new Error('Invalid Supabase URL format from function');
        }

        log('✅ Environment variables fetched from function successfully');
        return {
            url: env.SUPABASE_URL,
            anonKey: env.SUPABASE_ANON_KEY
        };
    } catch (error) {
        logError('Failed to fetch from function:', error);
    }

    // Method 4: Check localStorage cache (for development)
    const cachedUrl = localStorage.getItem('SUPABASE_URL');
    const cachedKey = localStorage.getItem('SUPABASE_ANON_KEY');
    
    if (cachedUrl && cachedKey && cachedUrl.includes('supabase.co')) {
        log('✅ Using cached environment variables from localStorage');
        return {
            url: cachedUrl,
            anonKey: cachedKey
        };
    }

    // If all methods fail, throw error
    throw new Error(`
No environment variables found. Tried:
1. _worker.js placeholders: Not replaced
2. window.INJECTED variables: Not found
3. /functions/env endpoint: Failed
4. localStorage cache: Not found

Please check:
- Cloudflare Pages environment variables are set
- Build has been deployed after setting variables
- _worker.js is properly configured
    `.trim());
}

// Prompt user for manual configuration
async function promptForConfiguration() {
    const message = `
⚠️ Supabase yapılandırması bulunamadı!

Lütfen Supabase projenizin bilgilerini girin:
1. Supabase Dashboard'a gidin
2. Settings > API bölümüne gidin
3. URL ve anon key değerlerini kopyalayın

Cloudflare Pages'de environment variable'ları kontrol edin:
- SUPABASE_URL (Plaintext)
- SUPABASE_ANON_KEY (Plaintext, Secret DEĞİL)

Devam etmek için Tamam'a basın.
    `.trim();

    alert(message);

    const url = prompt('Supabase URL (örn: https://xxxxx.supabase.co):', 'https://npfwslczctdocnkyntpf.supabase.co');
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
    debugLog('Using config:', {
        url: config.url,
        keyLength: config.anonKey.length
    });
    
    const client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: false,  // DISABLED to prevent auto-login issues
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

// Main initialization function with singleton pattern
async function initializeSupabaseConfig() {
    // Return existing client if already initialized
    if (window.SUPABASE_CONFIG.initialized && window.SUPABASE_CONFIG.client) {
        log('Already initialized, returning existing client');
        return window.SUPABASE_CONFIG.client;
    }
    
    // Return existing promise if initialization is in progress
    if (window.SUPABASE_CONFIG.initPromise) {
        log('Initialization already in progress, waiting...');
        return window.SUPABASE_CONFIG.initPromise;
    }

    log('Starting Supabase initialization...');
    
    // Create singleton promise
    window.SUPABASE_CONFIG.initPromise = (async () => {

    try {
        // Step 1: Load Supabase library
        await loadSupabaseLibrary();

        // Step 2: Get environment variables
        let config;
        try {
            config = await fetchEnvironmentVariables();
        } catch (fetchError) {
            logError('Environment fetch failed:', fetchError.message);
            if (DEBUG_MODE) {
                console.error('Full error:', fetchError);
            }
            log('Prompting for manual configuration...');
            config = await promptForConfiguration();
        }

        // Step 3: Initialize Supabase client
        const client = await initializeSupabase(config);

        // Step 4: Store in global config
        // Update global config while preserving initPromise
        window.SUPABASE_CONFIG = {
            ...window.SUPABASE_CONFIG,
            url: config.url,
            anonKey: config.anonKey,
            client: client,
            initialized: true,
            error: null
        };

        log('✅ Supabase configuration complete');
        
        // Show success in debug mode
        if (DEBUG_MODE) {
            const successDiv = document.createElement('div');
            successDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 15px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                z-index: 10000;
            `;
            successDiv.innerHTML = '✅ Supabase initialized successfully';
            document.body.appendChild(successDiv);
            setTimeout(() => successDiv.remove(), 3000);
        }
        
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
            ${DEBUG_MODE ? '<br><small>Debug mode aktif</small>' : ''}
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
    })();
    
    return window.SUPABASE_CONFIG.initPromise;
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