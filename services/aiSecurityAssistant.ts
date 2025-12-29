/**
 * AI Security Assistant Service
 * Provides intelligent security guidance using Google Gemini AI
 * UNIQUE FEATURE - No competitor has this!
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface SecurityAnalysis {
    overallScore: number;
    vulnerabilities: Vulnerability[];
    recommendations: Recommendation[];
    priorityActions: PriorityAction[];
}

export interface Vulnerability {
    type: 'weak_password' | 'reused_password' | 'old_password' | 'no_2fa' | 'breach' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedItems: string[];
}

export interface Recommendation {
    title: string;
    description: string;
    impact: string;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedTime: string;
}

export interface PriorityAction {
    action: string;
    reason: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class AISecurityAssistant {
    private ai: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey?: string) {
        const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY;
        if (!key) {
            throw new Error('Gemini API key not configured');
        }

        this.ai = new GoogleGenerativeAI(key);
        this.model = this.ai.getGenerativeModel({
            model: 'gemini-pro',
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        });
    }

    /**
     * Analyze password strength with AI insights
     */
    async analyzePassword(password: string): Promise<{
        strength: number;
        analysis: string;
        suggestions: string[];
        estimatedCrackTime: string;
    }> {
        const prompt = `As a cybersecurity expert, analyze this password and provide:
1. Strength score (0-100)
2. Detailed analysis of strengths and weaknesses
3. Specific improvement suggestions
4. Estimated time to crack

Password characteristics (don't reveal the actual password):
- Length: ${password.length}
- Has uppercase: ${/[A-Z]/.test(password)}
- Has lowercase: ${/[a-z]/.test(password)}
- Has numbers: ${/[0-9]/.test(password)}
- Has symbols: ${/[^a-zA-Z0-9]/.test(password)}
- Has repeated characters: ${/(.)\1{2,}/.test(password)}

Provide response in JSON format:
{
  "strength": number,
  "analysis": "detailed analysis",
  "suggestions": ["suggestion1", "suggestion2"],
  "estimatedCrackTime": "time estimate"
}`;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Fallback to basic analysis
            return this.fallbackPasswordAnalysis(password);
        }

        return this.fallbackPasswordAnalysis(password);
    }

    /**
     * Analyze user's overall security posture
     */
    async analyzeUserSecurity(profile: {
        totalPasswords: number;
        weakPasswords: number;
        reusedPasswords: number;
        oldPasswords: number;
        breachedPasswords: number;
        has2FA: boolean;
        lastPasswordChange: string;
    }): Promise<SecurityAnalysis> {
        const prompt = `As a cybersecurity expert, analyze this user's password security profile and provide comprehensive recommendations:

Profile:
- Total passwords: ${profile.totalPasswords}
- Weak passwords: ${profile.weakPasswords}
- Reused passwords: ${profile.reusedPasswords}
- Old passwords (>90 days): ${profile.oldPasswords}
- Breached passwords: ${profile.breachedPasswords}
- 2FA enabled: ${profile.has2FA}
- Last password change: ${profile.lastPasswordChange}

Provide response in JSON format:
{
  "overallScore": number (0-100),
  "vulnerabilities": [
    {
      "type": "weak_password|reused_password|old_password|no_2fa|breach",
      "severity": "low|medium|high|critical",
      "description": "detailed description",
      "affectedItems": ["item1", "item2"]
    }
  ],
  "recommendations": [
    {
      "title": "recommendation title",
      "description": "detailed description",
      "impact": "expected impact",
      "difficulty": "easy|medium|hard",
      "estimatedTime": "time estimate"
    }
  ],
  "priorityActions": [
    {
      "action": "specific action",
      "reason": "why it's important",
      "urgency": "low|medium|high|critical"
    }
  ]
}`;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            return this.fallbackSecurityAnalysis(profile);
        }

        return this.fallbackSecurityAnalysis(profile);
    }

    /**
     * Answer security questions with AI
     */
    async askSecurityQuestion(question: string, context?: any): Promise<string> {
        const contextStr = context ? `\n\nUser context: ${JSON.stringify(context)}` : '';

        const prompt = `You are a cybersecurity expert specializing in password management and digital security. 
Answer this question in a clear, helpful, and actionable way:

Question: ${question}${contextStr}

Provide a comprehensive but concise answer that:
1. Directly addresses the question
2. Provides actionable advice
3. Explains the security implications
4. Suggests best practices`;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    /**
     * Generate smart password suggestions
     */
    async suggestPassword(context: {
        site?: string;
        requirements?: any;
        memorable?: boolean;
    }): Promise<{
        password: string;
        explanation: string;
        strength: number;
    }> {
        const prompt = `Generate a strong, ${context.memorable ? 'memorable' : 'random'} password for ${context.site || 'a website'}.

Requirements:
${context.requirements ? JSON.stringify(context.requirements) : 'Standard strong password requirements'}

Provide response in JSON format:
{
  "password": "generated password",
  "explanation": "why this password is strong and how to remember it",
  "strength": number (0-100)
}`;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Fallback to random generation
            return this.fallbackPasswordGeneration(context);
        }

        return this.fallbackPasswordGeneration(context);
    }

    /**
     * Analyze potential security threats
     */
    async analyzeThreat(threat: {
        type: 'phishing' | 'malware' | 'breach' | 'social_engineering' | 'other';
        description: string;
        url?: string;
    }): Promise<{
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        analysis: string;
        recommendations: string[];
    }> {
        const prompt = `As a cybersecurity expert, analyze this potential security threat:

Type: ${threat.type}
Description: ${threat.description}
${threat.url ? `URL: ${threat.url}` : ''}

Provide response in JSON format:
{
  "riskLevel": "low|medium|high|critical",
  "analysis": "detailed threat analysis",
  "recommendations": ["action1", "action2", "action3"]
}`;

        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            return {
                riskLevel: 'medium',
                analysis: 'Unable to analyze threat. Please exercise caution.',
                recommendations: [
                    'Do not click on suspicious links',
                    'Verify sender authenticity',
                    'Report to security team'
                ]
            };
        }
    }

    /**
     * Get personalized security tips
     */
    async getDailySecurityTip(): Promise<string> {
        const prompt = `Provide a short, actionable cybersecurity tip for password manager users. 
Make it practical, easy to understand, and implementable today.
Keep it under 100 words.`;

        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }

    // Fallback methods when AI is unavailable

    private fallbackPasswordAnalysis(password: string) {
        let strength = 0;
        if (password.length >= 12) strength += 30;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

        return {
            strength,
            analysis: `Password has ${password.length} characters with ${this.getCharacterTypes(password)} character types.`,
            suggestions: this.getBasicSuggestions(password),
            estimatedCrackTime: this.estimateCrackTime(strength)
        };
    }

    private fallbackSecurityAnalysis(profile: any): SecurityAnalysis {
        const score = Math.max(0, 100 - (profile.weakPasswords * 10) - (profile.reusedPasswords * 15) - (profile.breachedPasswords * 20));

        return {
            overallScore: score,
            vulnerabilities: [],
            recommendations: [
                {
                    title: 'Update weak passwords',
                    description: `You have ${profile.weakPasswords} weak passwords that should be strengthened.`,
                    impact: 'Significantly improves account security',
                    difficulty: 'easy',
                    estimatedTime: '10 minutes'
                }
            ],
            priorityActions: [
                {
                    action: 'Change breached passwords immediately',
                    reason: 'These passwords are compromised',
                    urgency: 'critical'
                }
            ]
        };
    }

    private fallbackPasswordGeneration(context: any) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return {
            password,
            explanation: 'Randomly generated strong password',
            strength: 85
        };
    }

    private getCharacterTypes(password: string): number {
        let types = 0;
        if (/[a-z]/.test(password)) types++;
        if (/[A-Z]/.test(password)) types++;
        if (/[0-9]/.test(password)) types++;
        if (/[^a-zA-Z0-9]/.test(password)) types++;
        return types;
    }

    private getBasicSuggestions(password: string): string[] {
        const suggestions = [];
        if (password.length < 12) suggestions.push('Increase length to at least 12 characters');
        if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
        if (!/[a-z]/.test(password)) suggestions.push('Add lowercase letters');
        if (!/[0-9]/.test(password)) suggestions.push('Add numbers');
        if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Add special characters');
        return suggestions;
    }

    private estimateCrackTime(strength: number): string {
        if (strength < 30) return 'Seconds to minutes';
        if (strength < 50) return 'Hours to days';
        if (strength < 70) return 'Months to years';
        if (strength < 90) return 'Decades to centuries';
        return 'Millions of years';
    }
}

// Export singleton instance
export const aiSecurityAssistant = new AISecurityAssistant();
