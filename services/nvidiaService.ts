import axios from 'axios';
import { IPasswordEntry } from '../types';
import { hibpService } from './hibpService';

// NVIDIA NIM API Client
const nvidiaClient = axios.create({
    baseURL: 'https://integrate.api.nvidia.com/v1',
    headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_NVIDIA_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

// Best model for security auditing (70B parameters, excellent reasoning)
const SECURITY_MODEL = 'meta/llama-3.3-70b-instruct';

/**
 * Get password security audit using NVIDIA NIM
 * @param passwords - Array of password entries to audit
 * @returns HTML-formatted security audit report
 */
export const getPasswordAudit = async (passwords: IPasswordEntry[]): Promise<string> => {
    try {
        // Filter for login entries - check type OR presence of username/password fields
        const loginEntries = passwords.filter(p =>
            (p.type === 'login' || (p.username && p.password)) && p.password
        );

        if (loginEntries.length === 0) {
            return "<h2>No Login Passwords Found</h2><p>You don't have any login entries in your vault to audit.</p>";
        }

        // Prepare password data for analysis (without revealing actual passwords)
        const passwordData = loginEntries.map(p => ({
            site: p.siteName || p.url,
            username: p.username,
            passwordLength: p.password?.length || 0,
            hasUppercase: /[A-Z]/.test(p.password || ''),
            hasLowercase: /[a-z]/.test(p.password || ''),
            hasNumbers: /\d/.test(p.password || ''),
            hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(p.password || ''),
            createdAt: p.createdAt
        }));

        // Check for breaches using HIBP
        const breachChecks = await Promise.all(
            loginEntries.map(async (entry) => {
                if (entry.password) {
                    const breached = await hibpService.checkPassword(entry.password);
                    return {
                        site: entry.siteName || entry.url,
                        breached: breached.isBreached,
                        count: breached.count
                    };
                }
                return null;
            })
        );

        const breachedPasswords = breachChecks.filter(b => b && b.breached);

        // Create security audit prompt
        const prompt = `You are a cybersecurity expert conducting a password security audit.

**Password Analysis Data:**
Total Passwords: ${loginEntries.length}
Breached Passwords: ${breachedPasswords.length}

**Password Characteristics:**
${JSON.stringify(passwordData, null, 2)}

**Breached Passwords:**
${JSON.stringify(breachedPasswords, null, 2)}

**Task:**
Provide a comprehensive HTML-formatted security audit report with:
1. Overall security score (0-100)
2. Critical vulnerabilities found
3. Specific recommendations for each weak password
4. Best practices for password management

Format your response in clean HTML with proper headings, lists, and emphasis.`;

        // Call NVIDIA NIM API
        const response = await nvidiaClient.post('/chat/completions', {
            model: SECURITY_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional cybersecurity auditor specializing in password security. Provide detailed, actionable security recommendations in HTML format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,  // Low temperature for consistent security analysis
            max_tokens: 2048,
            top_p: 0.7
        });

        return response.data.choices[0].message.content;

    } catch (error: any) {
        console.error('NVIDIA NIM Password Audit Error:', error.response?.data || error.message);

        if (error.response?.status === 401) {
            return "<h2>API Key Error</h2><p>Invalid NVIDIA API key. Please verify your key in settings.</p>";
        }

        if (error.response?.status === 429) {
            return "<h2>Rate Limit Exceeded</h2><p>Too many requests. Please try again in a few minutes.</p>";
        }

        return "<h2>Analysis Error</h2><p>An error occurred while analyzing your passwords. Please try again later.</p>";
    }
};

/**
 * Get email breach audit using NVIDIA NIM
 * @param email - Email address to check for breaches
 * @returns HTML-formatted breach analysis report
 */
export const getEmailAudit = async (email: string): Promise<string> => {
    try {
        // Check HIBP for breaches
        const breaches = await hibpService.checkEmail(email);

        if (breaches.length === 0) {
            return `<h2>✅ Good News!</h2><p>The email <strong>${email}</strong> has not been found in any known data breaches.</p>`;
        }

        // Create breach analysis prompt
        const prompt = `You are a cybersecurity expert analyzing data breaches.

**Email:** ${email}
**Breaches Found:** ${breaches.length}

**Breach Details:**
${JSON.stringify(breaches, null, 2)}

**Task:**
Provide an HTML-formatted breach analysis report with:
1. Severity assessment
2. What data was compromised
3. Immediate actions to take
4. Long-term security recommendations

Format your response in clean HTML with proper headings, lists, and color-coded severity indicators.`;

        // Call NVIDIA NIM API
        const response = await nvidiaClient.post('/chat/completions', {
            model: SECURITY_MODEL,
            messages: [
                {
                    role: 'system',
                    content: 'You are a cybersecurity expert specializing in data breach analysis. Provide clear, actionable advice in HTML format.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2048,
            top_p: 0.7
        });

        return response.data.choices[0].message.content;

    } catch (error: any) {
        console.error('NVIDIA NIM Email Audit Error:', error.response?.data || error.message);
        return "<h2>Analysis Error</h2><p>An error occurred while analyzing the email for breaches. Please try again later.</p>";
    }
};

/**
 * Run dark web audit (alias for getEmailAudit for compatibility)
 * @param email - Email address to check for breaches
 * @returns Object with report and sources
 */
export const runDarkWebAudit = async (email: string): Promise<{ report: string; sources: any[] }> => {
    const report = await getEmailAudit(email);
    return {
        report,
        sources: [] // NVIDIA NIM doesn't provide sources like Gemini, but we maintain API compatibility
    };
};

