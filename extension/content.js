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
    overlay.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 2147483647; 
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid rgba(14, 165, 233, 0.3);
                border-radius: 16px; padding: 20px; width: 360px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5); backdrop-filter: blur(20px);
                animation: slideIn 0.3s ease-out;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                    border-radius: 10px; display: flex; align-items: center; justify-content: center;
                    font-size: 20px;">🔒</div>
        <div style="flex: 1; color: #f1f5f9; font-weight: 600; font-size: 15px; font-family: -apple-system, sans-serif;">
          Save password for ${window.location.hostname}?
        </div>
      </div>
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-family: -apple-system, sans-serif;">
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Username</div>
        <div style="color: #f1f5f9; font-size: 14px;">${credentials.username || 'No username'}</div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="lens-vault-never" style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #e2e8f0;
                cursor: pointer; font-weight: 600; font-size: 14px; font-family: -apple-system, sans-serif;">
          Never
        </button>
        <button id="lens-vault-later" style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #e2e8f0;
                cursor: pointer; font-weight: 600; font-size: 14px; font-family: -apple-system, sans-serif;">
          Not Now
        </button>
        <button id="lens-vault-save" style="flex: 1; padding: 10px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                border: none; border-radius: 8px; color: white;
                cursor: pointer; font-weight: 600; font-size: 14px; font-family: -apple-system, sans-serif;">
          Save
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // Button handlers
    document.getElementById('lens-vault-save').onclick = () => {
        chrome.runtime.sendMessage({
            action: 'SAVE_CREDENTIAL',
            website: window.location.href,
            username: credentials.username,
            password: credentials.password,
        });
        overlay.remove();
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