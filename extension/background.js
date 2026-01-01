// Supabase Configuration for Extension
const SUPABASE_URL = 'https://rxiuvuzymebrrbhmftcx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4aXV2dXp5bWVicnJiaG1mdGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MDM5NTgsImV4cCI6MjA4MDQ3OTk1OH0.w8K0JMc0CATss87bRga967prGnpM_gIdE2XGEZVHK5I';

// Supabase client initialization
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.baseUrl = `${url}/rest/v1`;
    }

    async query(table, options = {}) {
        const params = new URLSearchParams();
        if (options.select) params.append('select', options.select);
        if (options.eq) {
            Object.entries(options.eq).forEach(([key, value]) => {
                params.append(key, `eq.${value}`);
            });
        }

        const response = await fetch(`${this.baseUrl}/${table}?${params}`, {
            headers: {
                'apikey': this.key,
                'Authorization': `Bearer ${this.key}`,
                'Content-Type': 'application/json',
            },
        });

        return response.json();
    }

    async insert(table, data) {
        const response = await fetch(`${this.baseUrl}/${table}`, {
            method: 'POST',
            headers: {
                'apikey': this.key,
                'Authorization': `Bearer ${this.key}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(data),
        });

        return response.json();
    }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Background service worker
console.log('🔒 Lens Vault background service starting...');

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_CURRENT_URL') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            sendResponse({ url: tabs[0]?.url || '' });
        });
        return true;
    }

    if (request.action === 'FILL_CREDENTIALS') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'FILL_CREDENTIALS',
                    username: request.username,
                    password: request.password,
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ success: true });
                    }
                });
            }
        });
        return true;
    }

    // Save credential to Supabase
    if (request.action === 'SAVE_CREDENTIAL') {
        console.log('🔒 Lens Vault: Saving credential for', request.website);
        (async () => {
            try {
                const result = await supabase.insert('vault_items', {
                    website: request.website,
                    username: request.username,
                    password_encrypted: request.password,
                    type: 'login',
                    name: new URL(request.website).hostname,
                });

                console.log('🔒 Lens Vault: Save success', result);
                chrome.action.setBadgeText({ text: '✓' });
                chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
                setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);

                sendResponse({ success: true, data: result });
            } catch (error) {
                console.error('🔒 Lens Vault: Save error', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep channel open for async response
    }

    // Get vault entries from Supabase
    if (request.action === 'GET_VAULT') {
        (async () => {
            try {
                const entries = await supabase.query('vault_items', {
                    select: '*',
                    eq: { type: 'login' },
                });

                sendResponse({ success: true, entries: entries || [] });
            } catch (error) {
                sendResponse({ success: false, error: error.message, entries: [] });
            }
        })();
        return true;
    }

    // Get vault entries for specific domain
    if (request.action === 'GET_VAULT_FOR_DOMAIN') {
        (async () => {
            try {
                const allEntries = await supabase.query('vault_items', {
                    select: '*',
                    eq: { type: 'login' },
                });

                const domain = request.domain;
                const matches = (allEntries || []).filter(e => {
                    try {
                        const entryDomain = new URL(e.website).hostname;
                        return entryDomain.includes(domain) || domain.includes(entryDomain);
                    } catch {
                        return e.website.includes(domain);
                    }
                });

                sendResponse({ success: true, entries: matches });
            } catch (error) {
                sendResponse({ success: false, error: error.message, entries: [] });
            }
        })();
        return true;
    }
});

console.log('🔒 Lens Vault background service ready ✓');
