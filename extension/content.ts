/// <reference types="chrome"/>
import { FormDetector, LoginForm } from './lib/form-detector';
import { SiteSecurityService } from './lib/site-security';

interface VaultEntry {
    id: string;
    website: string;
    username: string;
    password_encrypted: string;
}

interface PendingCredentials {
    username: string;
    password: string;
    url: string;
}

class ContentScript {
    private formDetector: FormDetector;
    private _siteIsSafe = false;
    private get siteIsSafe(): boolean { return this._siteIsSafe; }

    constructor() {
        this.formDetector = new FormDetector();
        this.init();
    }

    private init() {
        // Initial scan
        this.scanForForms();

        // Listen for DOM changes
        const observer = new MutationObserver(() => this.scanForForms());
        observer.observe(document.body, { childList: true, subtree: true });

        // Listen for vault updates
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'VAULT_UPDATED') {
                this.vaultEntries = request.entries;
            }
        });

        // Notify background we are ready
        chrome.runtime.sendMessage({ action: 'CONTENT_SCRIPT_READY', url: window.location.href });

        // Perform security check
        SiteSecurityService.checkSite(window.location.href).then(result => {
            if (result.isSafe) {
                this._siteIsSafe = true;
            } else {
                SiteSecurityService.showSecurityWarning(result.threat || 'Unknown threat');
            }
        });
    }

    private scanForForms() {
        const forms = this.formDetector.detectLoginForms();
        if (forms.length > 0) {
            this.currentForms = forms;
            this.attachFormListeners(forms);
            this.attachFieldListeners(forms);
        }
    }

    private attachFormListeners(forms: LoginForm[]) {
        forms.forEach((loginForm) => {
            if (!loginForm.form) return;

            loginForm.form.addEventListener('submit', (e) => {
                this.handleFormSubmit(loginForm);
            });
        });
    }

    /**
     * Attach focus listeners to show autofill dropdown
     */
    private attachFieldListeners(forms: LoginForm[]) {
        forms.forEach((loginForm) => {
            if (!loginForm.usernameField) return;

            loginForm.usernameField.addEventListener('focus', () => {
                this.showAutofillDropdown(loginForm);
            });

            // Hide dropdown on blur (with delay to allow clicking)
            loginForm.usernameField.addEventListener('blur', () => {
                setTimeout(() => this.hideAutofillDropdown(), 200);
            });
        });
    }

    /**
   * Handle form submission - store credentials for post-navigation check
   */
    private handleFormSubmit(loginForm: LoginForm) {
        if (!this.siteIsSafe) return;

        const credentials = this.formDetector.extractCredentials(loginForm);
        if (!credentials) return;

        // Store credentials to check after navigation
        this.pendingCredentials = {
            username: credentials.username,
            password: credentials.password,
            url: window.location.href,
        };
    }

    /**
     * Show save prompt for pending credentials (after successful navigation)
     */
    private showSavePromptForPending() {
        if (!this.pendingCredentials || this.savePromptShown) return;

        const credentials = this.pendingCredentials;
        this.pendingCredentials = null;

        // Check if credentials already exist in vault
        const domain = new URL(credentials.url).hostname;
        const existing = this.vaultEntries.find(
            (e) =>
                e.username === credentials.username &&
                (e.website.includes(domain) || domain.includes(e.website))
        );

        if (existing) {
            // Check if password changed
            if (existing.password_encrypted !== credentials.password) {
                this.showUpdatePrompt(existing.id, credentials);
            }
        } else {
            // New credential - show save prompt
            this.showSavePrompt(credentials);
        }
    }

    /**
     * Show save credential prompt overlay
     */
    private showSavePrompt(credentials: { username: string; password: string }) {
        if (this.savePromptShown) return;
        this.savePromptShown = true;

        const overlay = document.createElement('div');
        overlay.id = 'lens-vault-save-prompt';
        overlay.innerHTML = `
      <div class="lens-vault-overlay">
        <div class="lens-vault-prompt">
          <div class="lens-vault-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Save password for ${window.location.hostname}?</span>
          </div>
          <div class="lens-vault-content">
            <div class="lens-vault-field">
              <label>Username</label>
              <div>${credentials.username}</div>
            </div>
            <div class="lens-vault-field">
              <label>Password</label>
              <div>••••••••</div>
            </div>
          </div>
          <div class="lens-vault-actions">
            <button class="lens-vault-btn lens-vault-btn-secondary" data-action="never">Never</button>
            <button class="lens-vault-btn lens-vault-btn-secondary" data-action="later">Not Now</button>
            <button class="lens-vault-btn lens-vault-btn-primary" data-action="save">Save</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        // Handle button clicks
        overlay.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const action = (e.target as HTMLElement).getAttribute('data-action');

                if (action === 'save') {
                    chrome.runtime.sendMessage({
                        action: 'SAVE_CREDENTIAL',
                        website: window.location.href,
                        username: credentials.username,
                        password: credentials.password,
                    });
                }

                overlay.remove();
                this.savePromptShown = false;
            });
        });

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (overlay.isConnected) {
                overlay.remove();
                this.savePromptShown = false;
            }
        }, 10000);
    }

    /**
     * Show update password prompt
     */
    private showUpdatePrompt(
        entryId: string,
        credentials: { username: string; password: string }
    ) {
        const overlay = document.createElement('div');
        overlay.id = 'lens-vault-update-prompt';
        overlay.innerHTML = `
      <div class="lens-vault-overlay">
        <div class="lens-vault-prompt">
          <div class="lens-vault-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
            <span>Update password for ${window.location.hostname}?</span>
          </div>
          <div class="lens-vault-actions">
            <button class="lens-vault-btn lens-vault-btn-secondary" data-action="cancel">Cancel</button>
            <button class="lens-vault-btn lens-vault-btn-primary" data-action="update">Update</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll('button').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const action = (e.target as HTMLElement).getAttribute('data-action');

                if (action === 'update') {
                    chrome.runtime.sendMessage({
                        action: 'UPDATE_CREDENTIAL',
                        id: entryId,
                        password: credentials.password,
                    });
                }

                overlay.remove();
            });
        });
    }

    /**
     * Show autofill dropdown with matching credentials
     */
    private showAutofillDropdown(loginForm: LoginForm) {
        if (!loginForm.usernameField) return;

        const domain = window.location.hostname;
        const matches = this.vaultEntries.filter((e) => {
            try {
                const entryDomain = new URL(e.website).hostname;
                return entryDomain.includes(domain) || domain.includes(entryDomain);
            } catch {
                return e.website.includes(domain);
            }
        });

        if (matches.length === 0) return;

        // Remove existing dropdown
        this.hideAutofillDropdown();

        const dropdown = document.createElement('div');
        dropdown.id = 'lens-vault-autofill-dropdown';
        dropdown.className = 'lens-vault-dropdown';

        matches.forEach((entry) => {
            const item = document.createElement('div');
            item.className = 'lens-vault-dropdown-item';
            item.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5z"></path>
        </svg>
        <span>${entry.username}</span>
      `;

            item.addEventListener('click', () => {
                this.formDetector.fillCredentials(
                    loginForm,
                    entry.username,
                    entry.password_encrypted
                );
                this.hideAutofillDropdown();
            });

            dropdown.appendChild(item);
        });

        // Position dropdown below the field
        const rect = loginForm.usernameField.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        dropdown.style.width = `${rect.width}px`;

        document.body.appendChild(dropdown);
    }

    /**
     * Hide autofill dropdown
     */
    private hideAutofillDropdown() {
        const existing = document.getElementById('lens-vault-autofill-dropdown');
        if (existing) {
            existing.remove();
        }
    }

    /**
     * Fill credentials (called from popup or background)
     */
    private fillCredentials(username: string, password: string) {
        if (this.currentForms.length > 0) {
            this.formDetector.fillCredentials(this.currentForms[0], username, password);
        }
    }
}

// Initialize content script
new ContentScript();

// Inject installation marker for the main web app to detect
const marker = document.createElement('div');
marker.id = 'lens-vault-installed-marker';
marker.style.display = 'none';
document.body.appendChild(marker);

// Also set a global flag
// @ts-ignore
window.lensVaultExtensionInstalled = true;
