// Lens Vault Content Script - Active Login Detection
console.log('🔒 Lens Vault: Content script active');

// Signal to web app that extension is installed
window.lensVaultExtensionInstalled = true;
const marker = document.createElement('div');
marker.id = 'lens-vault-installed-marker';
marker.style.display = 'none';
document.body.appendChild(marker);

const formDetector = new FormDetector();
let currentForms = [];
let vaultEntries = [];

// Form Detector Class
function FormDetector() {
    this.detectLoginForms = function () {
        const forms = [];
        const passwordFields = document.querySelectorAll('input[type="password"]');

        passwordFields.forEach((passwordField) => {
            const form = passwordField.closest('form');
            const usernameField = this.findUsernameField(form || document.body, passwordField);

            if (usernameField || form) {
                forms.push({
                    form: form || passwordField.parentElement,
                    usernameField,
                    passwordField
                });
            }
        });

        return forms;
    };

    this.findUsernameField = function (scope, passwordField) {
        const candidates = scope.querySelectorAll('input[type="email"], input[type="text"], input:not([type])');

        for (const candidate of candidates) {
            if (passwordField.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING) {
                continue;
            }

            const name = (candidate.name || '').toLowerCase();
            const id = (candidate.id || '').toLowerCase();
            const placeholder = (candidate.placeholder || '').toLowerCase();

            if (name.includes('user') || name.includes('email') || name.includes('login') ||
                id.includes('user') || id.includes('email') || id.includes('login') ||
                placeholder.includes('email') || placeholder.includes('username')) {
                return candidate;
            }
        }

        return scope.querySelector('input[type="email"], input[type="text"]');
    };

    this.fillCredentials = function (loginForm, username, password) {
        if (loginForm.usernameField) {
            loginForm.usernameField.value = username;
            loginForm.usernameField.dispatchEvent(new Event('input', { bubbles: true }));
            loginForm.usernameField.dispatchEvent(new Event('change', { bubbles: true }));
        }

        loginForm.passwordField.value = password;
        loginForm.passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        loginForm.passwordField.dispatchEvent(new Event('change', { bubbles: true }));
    };

    this.extractCredentials = function (loginForm) {
        const username = loginForm.usernameField?.value || '';
        const password = loginForm.passwordField.value || '';

        if (!password) return null;
        return { username, password };
    };
}

// Site Security Service - Malware & Phishing Detection
const SiteSecurity = {
    // Known malicious patterns
    patterns: [
        /phish/i, /scam/i, /fake-login/i, /verify-account/i,
        /suspended-account/i, /secure-update/i
    ],

    // Trusted domains (skip checks)
    trusted: [
        'google.com', 'github.com', 'microsoft.com', 'apple.com',
        'amazon.com', 'facebook.com', 'twitter.com', 'linkedin.com',
        'localhost'
    ],

    checkSite: function () {
        const url = window.location.href;
        const hostname = window.location.hostname;

        // 1. Check Trusted
        if (this.trusted.some(d => hostname.endsWith(d))) return { safe: true };

        // 2. Check Protocol
        if (window.location.protocol !== 'https:' && hostname !== 'localhost') {
            return {
                safe: false,
                reason: 'Insecure connection (HTTP). Passwords should not be entered here.'
            };
        }

        // 3. Check Malicious Patterns
        if (this.patterns.some(p => p.test(url))) {
            return {
                safe: false,
                reason: 'Suspicious URL pattern detected. This may be a phishing site.'
            };
        }

        // 4. Check URL Length (Buffer overflow/obfuscation attempts)
        if (url.length > 2048) {
            return { safe: false, reason: 'URL is abnormally long.' };
        }

        return { safe: true };
    },

    showWarning: function (reason) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0;
            background: #ef4444; color: white; padding: 12px;
            text-align: center; z-index: 2147483647; font-family: system-ui;
            font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        warning.innerHTML = `
            <span>⚠️ Lens Vault Security Warning: ${reason}</span>
            <button style="margin-left: 10px; background: rgba(0,0,0,0.2); border: none; 
                    padding: 4px 8px; color: white; border-radius: 4px; cursor: pointer;">
                Dismiss
            </button>
        `;

        warning.querySelector('button').onclick = () => warning.remove();
        document.body.prepend(warning);
    }
};

// Initialize - detect forms only if site is safe
function initializeDetection() {
    console.log('🔒 Lens Vault: Running security check...');
    const security = SiteSecurity.checkSite();

    if (!security.safe) {
        console.warn('🔒 Lens Vault Security Alert:', security.reason);
        SiteSecurity.showWarning(security.reason);
        return; // STOP execution - do not detect forms
    }

    console.log('🔒 Lens Vault: Site verified safe.');
    currentForms = formDetector.detectLoginForms();

    if (currentForms.length > 0) {
        console.log('🔒 Lens Vault: Detected', currentForms.length, 'login form(s)');
        attachFormListeners();
    }
}

// Attach form submit listeners
function attachFormListeners() {
    currentForms.forEach((loginForm) => {
        if (!loginForm.form) return;

        loginForm.form.addEventListener('submit', (e) => {
            handleFormSubmit(loginForm);
        });
    });
}

// Handle form submission
function handleFormSubmit(loginForm) {
    const credentials = formDetector.extractCredentials(loginForm);
    if (!credentials) return;

    console.log('🔒 Lens Vault: Form submitted, credentials captured');

    // Show save prompt after a delay (allow page to navigate)
    setTimeout(() => {
        showSavePrompt(credentials);
    }, 1000);
}

// Show save prompt
function showSavePrompt(credentials) {
    // Check if already exists
    const domain = window.location.hostname;
    const existing = vaultEntries.find(e =>
        e.username === credentials.username &&
        (e.website.includes(domain) || domain.includes(new URL(e.website).hostname))
    );

    if (existing) {
        console.log('🔒 Lens Vault: Credentials already saved');
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'lens-vault-save-prompt';
    // Glassmorphism Style Matching App.tsx
    // bg-background/80 -> rgba(11, 20, 39, 0.85) (assuming roughly dark background)
    // border-primary/20 -> rgba(14, 165, 233, 0.2)
    overlay.innerHTML = `
        < div style = "position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; 
    background: rgba(11, 20, 39, 0.9);
    backdrop - filter: blur(12px);
    border: 1px solid rgba(14, 165, 233, 0.2);
    border - radius: 16px; padding: 16px; width: 320px;
    box - shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    font - family: -apple - system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans - serif;
    animation: slideIn 0.5s cubic - bezier(0.19, 1, 0.22, 1);
    color: #f8fafc; ">

        < div style = "display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px;" >
        <div style="padding: 8px; background: rgba(14, 165, 233, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 2px 0; font-weight: 600; font-size: 14px; color: #f1f5f9; line-height: 1.4;">Save Password?</h4>
          <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
            Securely save credentials for ${window.location.hostname}
          </p>
        </div>
      </div >

      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 10px; margin-bottom: 16px;">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <span style="font-size: 11px; color: #64748b; font-weight: 500;">USERNAME</span>
            <span style="font-size: 11px; color: #64748b; font-weight: 500;">PASSWORD</span>
         </div>
         <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; color: #e2e8f0; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${credentials.username || 'No username'}</span>
            <span style="font-size: 18px; color: #e2e8f0; line-height: 0.5; margin-top: 6px;">••••••••</span>
         </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button id="lens-vault-save" style="flex: 1; height: 32px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                border: none; border-radius: 6px; color: white;
                cursor: pointer; font-weight: 500; font-size: 12px; transition: opacity 0.2s;">
          Save
        </button>
        <button id="lens-vault-later" style="flex: 1; height: 32px; background: transparent;
                border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; color: #cbd5e1;
                cursor: pointer; font-weight: 500; font-size: 12px; transition: background 0.2s;">
          Not Now
        </button>
      </div>
      <div style="text-align: center; margin-top: 8px;">
        <button id="lens-vault-never" style="background: none; border: none; color: #475569; font-size: 10px; cursor: pointer; text-decoration: underline;">
            Never save for this site
        </button>
      </div>
    </div >
        `;

    document.body.appendChild(overlay);

    // Button handlers
    document.getElementById('lens-vault-save').onclick = () => {
        const btn = document.getElementById('lens-vault-save');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        chrome.runtime.sendMessage({
            action: 'SAVE_CREDENTIAL',
            website: window.location.href,
            username: credentials.username,
            password: credentials.password,
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error('🔒 Lens Vault: Connection error:', chrome.runtime.lastError.message);
                alert('Connection to Lens Vault failed. Please reload the page and try again.');
            } else if (response && response.success) {
                console.log('🔒 Lens Vault: Saved successfully');
                overlay.remove();
            } else {
                console.error('🔒 Lens Vault: Save failed:', response?.error);
                btn.textContent = 'Failed';
                btn.style.background = '#ef4444';
                setTimeout(() => overlay.remove(), 2000);
            }
        });
    };

    document.getElementById('lens-vault-never').onclick = () => overlay.remove();
    document.getElementById('lens-vault-later').onclick = () => overlay.remove();

    // Auto-hide after 15 seconds
    setTimeout(() => {
        if (overlay.isConnected) overlay.remove();
    }, 15000);
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'FILL_CREDENTIALS') {
        if (currentForms.length > 0) {
            formDetector.fillCredentials(currentForms[0], request.username, request.password);
            console.log('🔒 Lens Vault: Credentials filled');
        }
    }

    if (request.action === 'VAULT_UPDATED') {
        vaultEntries = request.entries;
    }
});

// Run detection on load and watch for new forms
setTimeout(() => initializeDetection(), 500);
setInterval(() => {
    const newForms = formDetector.detectLoginForms();
    if (newForms.length > currentForms.length) {
        currentForms = newForms;
        attachFormListeners();
    }
}, 2000);

// Notify background
chrome.runtime.sendMessage({
    action: 'CONTENT_SCRIPT_READY',
    url: window.location.href,
});

console.log('🔒 Lens Vault: Ready to protect your passwords ✓');