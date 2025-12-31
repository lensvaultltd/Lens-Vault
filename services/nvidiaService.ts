import axios from 'axios';
import { IPasswordEntry } from '../types';
import { hibpService } from './hibpService';
import { supabase } from '../lib/supabaseClient';

// NVIDIA NIM API Client - Using Supabase Edge Function to avoid CORS
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const nvidiaClient = axios.create({
    baseURL: `${SUPABASE_URL}/functions/v1`,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
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
        const prompt = `You're a friendly cybersecurity expert helping someone secure their passwords. Be conversational and helpful, not formal or robotic.

Here's what you're analyzing:
- Total passwords: ${loginEntries.length}
- Passwords found in breaches: ${breachedPasswords.length}

Password details:
${JSON.stringify(passwordData, null, 2)}

Breached passwords:
${JSON.stringify(breachedPasswords, null, 2)}

Give them a quick, friendly security report in HTML format:
1. Start with an overall security score (0-100) and what it means in 1-2 sentences
2. Point out any serious issues using bullet points (<ul><li>)
3. Give specific, actionable advice as a bulleted list
4. Share 2-3 quick tips as bullet points

IMPORTANT FORMATTING:
- Use <h3> for section headings
- Use <ul> and <li> for all lists and bullet points
- Add <br> tags or <p> tags to create spacing between sections
- Keep paragraphs short (1-2 sentences max)
- Use <strong> to highlight important points

Keep it conversational, concise, and well-spaced - easy to scan and read!`;

        // Call NVIDIA NIM API via Supabase Edge Function (avoids CORS)
        const response = await nvidiaClient.post('/nvidia-ai', {
            messages: [
                {
                    role: 'system',
                    content: 'You are a friendly, knowledgeable cybersecurity expert. Speak naturally and conversationally - like you\'re helping a friend, not writing a formal report. Be concise, clear, and helpful. Use everyday language, not jargon. Keep responses under 200 words unless there are serious issues.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,  // Low temperature for consistent security analysis
            max_tokens: 2048
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
        const prompt = `You're helping someone understand if their email was in any data breaches. Be friendly and reassuring, but honest.

Email checked: ${email}
Breaches found: ${breaches.length}

Breach info:
${JSON.stringify(breaches, null, 2)}

Give them a quick, clear explanation in HTML:
1. How serious is this? (1-2 sentences)
2. What info was leaked? (use bullet points)
3. What should they do right now? (bulleted action items)
4. How to stay safer going forward (2-3 bullet points)

FORMATTING RULES:
- Use <h3> for section headings
- Use <ul> and <li> for ALL lists
- Add <br> or <p> tags between sections for spacing
- Keep paragraphs to 1-2 sentences
- Use <strong> for important warnings

Make it easy to scan and read - not a wall of text!`;

        // Call NVIDIA NIM API via Supabase Edge Function (avoids CORS)
        const response = await nvidiaClient.post('/nvidia-ai', {
            messages: [
                {
                    role: 'system',
                    content: 'You are a friendly cybersecurity expert who explains things clearly without being scary or overly technical. Be conversational, reassuring, and helpful. Use simple language and keep it brief - under 150 words unless it\'s really serious.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 2048
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

