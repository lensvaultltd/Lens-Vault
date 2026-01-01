
import { EncryptionService } from '../lib/encryption';

// Use Vite environment variable (works in browser)
const HIBP_API_KEY = import.meta.env?.VITE_HIBP_API_KEY || '';

export const hibpService = {
    /**
     * Checks if a password has been exposed in data breaches using k-Anonymity.
     * Returns the number of times the password has been seen.
     * This API is FREE and doesn't require an API key!
     */
    async checkPassword(password: string): Promise<number> {
        try {
            // 1. Hash the password with SHA-1
            const buffer = new TextEncoder().encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

            // 2. Send the first 5 characters (prefix) to HIBP
            const prefix = hashHex.substring(0, 5);
            const suffix = hashHex.substring(5);

            const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
            if (!response.ok) {
                throw new Error(`HIBP API Error: ${response.statusText}`);
            }

            const text = await response.text();

            // 3. Check if our suffix is in the response
            // Response format: SUFFIX:COUNT
            const lines = text.split('\n');
            for (const line of lines) {
                const [lineSuffix, count] = line.split(':');
                if (lineSuffix.trim() === suffix) {
                    return parseInt(count, 10);
                }
            }

            return 0;
        } catch (error) {
            console.error('Error checking password against HIBP:', error);
            return 0; // Fail safe
        }
    },

    /**
     * Checks if an email has been involved in data breaches.
     * NOTE: HIBP API key costs $3.50/month. For free alternative, we skip this
     * and let Gemini AI do web search instead.
     */
    async checkEmail(email: string): Promise<any[]> {
        // If no API key, return empty array and let Gemini AI search the web
        if (!HIBP_API_KEY) {
            console.log('HIBP API key not configured. Using AI web search for breach detection.');
            return [];
        }

        try {
            const response = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`, {
                headers: {
                    'hibp-api-key': HIBP_API_KEY,
                    'user-agent': 'LensVault-App'
                }
            });

            if (response.status === 404) {
                return []; // No breaches found
            }

            if (!response.ok) {
                throw new Error(`HIBP API Error: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error checking email against HIBP:', error);
            return [];
        }
    }
};
