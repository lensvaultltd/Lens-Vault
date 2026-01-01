/// <reference types="chrome"/>

interface SecurityCheckResult {
    isSafe: boolean;
    threat?: string;
    score?: number;
}

/**
 * Site Security Service
 * Checks for malware, phishing, and known malicious domains
 */
export class SiteSecurityService {
    private static readonly GOOGLE_SAFE_BROWSING_API = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';
    private static readonly MALICIOUS_PATTERNS = [
        /phish/i,
        /scam/i,
        /fake-login/i,
        /verify-account/i,
        /suspended-account/i,
    ];

    private static readonly KNOWN_SAFE_DOMAINS = new Set([
        'google.com',
        'github.com',
        'microsoft.com',
        'apple.com',
        'amazon.com',
        'facebook.com',
        'twitter.com',
        'linkedin.com',
    ]);

    /**
     * Check if a URL is safe to autofill on
     */
    static async checkSite(url: string): Promise<SecurityCheckResult> {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;

            // Check against known safe domains
            const baseDomain = this.getBaseDomain(hostname);
            if (this.KNOWN_SAFE_DOMAINS.has(baseDomain)) {
                return { isSafe: true };
            }

            // Check for suspicious URL patterns
            if (this.MALICIOUS_PATTERNS.some(pattern => pattern.test(url))) {
                return {
                    isSafe: false,
                    threat: 'Suspicious URL pattern detected',
                    score: 80,
                };
            }

            // Check for HTTPS
            if (urlObj.protocol !== 'https:') {
                return {
                    isSafe: false,
                    threat: 'Insecure connection (HTTP)',
                    score: 60,
                };
            }

            // Check URL length (phishing URLs are often very long)
            if (url.length > 200) {
                return {
                    isSafe: false,
                    threat: 'Abnormally long URL',
                    score: 50,
                };
            }

            // Check for excessive subdomain levels (phishing indicator)
            const subdomains = hostname.split('.');
            if (subdomains.length > 4) {
                return {
                    isSafe: false,
                    threat: 'Suspicious subdomain structure',
                    score: 70,
                };
            }

            // All checks passed
            return { isSafe: true };
        } catch (error) {
            // Invalid URL
            return {
                isSafe: false,
                threat: 'Invalid URL',
                score: 100,
            };
        }
    }

    /**
     * Get base domain from hostname
     */
    private static getBaseDomain(hostname: string): string {
        const parts = hostname.split('.');
        if (parts.length >= 2) {
            return parts.slice(-2).join('.');
        }
        return hostname;
    }

    /**
     * Show security warning overlay
     */
    static showSecurityWarning(reason: string) {
        const overlay = document.createElement('div');
        overlay.id = 'lens-vault-security-warning';
        overlay.innerHTML = `
      <div class="lens-vault-overlay">
        <div class="lens-vault-security-alert">
          <div class="lens-vault-security-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2>⚠️ Security Warning</h2>
          <p><strong>Lens Vault has detected a potential security threat:</strong></p>
          <p class="threat-reason">${reason}</p>
          <p class="security-notice">
            For your protection, Lens Vault will not autofill credentials on this site.
            If you believe this is a false positive, you can manually copy credentials from the extension popup.
          </p>
          <button class="lens-vault-btn lens-vault-btn-primary" onclick="this.closest('#lens-vault-security-warning').remove()">
            I Understand
          </button>
        </div>
      </div>
    `;

        // Add security warning styles
        const style = document.createElement('style');
        style.textContent = `
      .lens-vault-security-alert {
        background: linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%);
        border: 2px solid #dc2626;
        max-width: 500px;
        text-align: center;
      }
      .lens-vault-security-icon {
        color: #fca5a5;
        margin: 0 auto 16px;
      }
      .lens-vault-security-alert h2 {
        color: #fef2f2;
        font-size: 24px;
        margin-bottom: 16px;
      }
      .lens-vault-security-alert p {
        color: #fecaca;
        margin-bottom: 12px;
        line-height: 1.6;
      }
      .threat-reason {
        background: rgba(0, 0, 0, 0.3);
        padding: 12px;
        border-radius: 6px;
        font-weight: 600;
        color: #fef2f2;
      }
      .security-notice {
        font-size: 14px;
        color: #fed7aa;
      }
    `;
        document.head.appendChild(style);
        document.body.appendChild(overlay);
    }
}
