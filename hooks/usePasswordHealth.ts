/**
 * Password Health Analysis Hook
 * Analyzes vault passwords for security issues
 */

import { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/apiService';

export interface PasswordHealthMetrics {
    overallScore: number; // 0-100
    weakPasswords: PasswordIssue[];
    reusedPasswords: PasswordIssue[];
    oldPasswords: PasswordIssue[];
    breachedPasswords: PasswordIssue[];
    totalPasswords: number;
    strongPasswords: number;
}

export interface PasswordIssue {
    id: string;
    title: string;
    url?: string;
    issue: 'weak' | 'reused' | 'old' | 'breached';
    severity: 'low' | 'medium' | 'high' | 'critical';
    strength?: number;
    age?: number; // days
    reuseCount?: number;
    breachCount?: number;
    recommendation: string;
}

export function usePasswordHealth() {
    const [health, setHealth] = useState<PasswordHealthMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        analyzePasswordHealth();
    }, []);

    const analyzePasswordHealth = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch all vault items
            const passwords = await apiService.getVaultItems();

            // Analyze each password
            const weakPasswords: PasswordIssue[] = [];
            const reusedPasswords: PasswordIssue[] = [];
            const oldPasswords: PasswordIssue[] = [];
            const breachedPasswords: PasswordIssue[] = [];

            const passwordMap = new Map<string, number>();
            let strongCount = 0;

            for (const item of passwords) {
                const password = item.password; // Decrypted password
                const strength = calculatePasswordStrength(password);
                const age = calculatePasswordAge(item.updated_at || item.created_at);

                // Check for weak passwords
                if (strength < 60) {
                    weakPasswords.push({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        issue: 'weak',
                        severity: strength < 30 ? 'critical' : strength < 50 ? 'high' : 'medium',
                        strength,
                        recommendation: getWeakPasswordRecommendation(strength)
                    });
                } else {
                    strongCount++;
                }

                // Check for reused passwords
                const hash = await hashPassword(password);
                const count = (passwordMap.get(hash) || 0) + 1;
                passwordMap.set(hash, count);

                if (count > 1) {
                    reusedPasswords.push({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        issue: 'reused',
                        severity: count > 3 ? 'critical' : count > 2 ? 'high' : 'medium',
                        reuseCount: count,
                        recommendation: 'Generate a unique password for this account'
                    });
                }

                // Check for old passwords (>90 days)
                if (age > 90) {
                    oldPasswords.push({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        issue: 'old',
                        severity: age > 365 ? 'high' : age > 180 ? 'medium' : 'low',
                        age,
                        recommendation: `Last changed ${age} days ago. Consider updating.`
                    });
                }

                // Check for breached passwords (if HIBP is enabled)
                if (item.is_breached) {
                    breachedPasswords.push({
                        id: item.id,
                        title: item.title,
                        url: item.url,
                        issue: 'breached',
                        severity: 'critical',
                        breachCount: item.breach_count || 1,
                        recommendation: 'Change immediately! This password was found in a data breach.'
                    });
                }
            }

            // Calculate overall score
            const totalIssues = weakPasswords.length + reusedPasswords.length +
                oldPasswords.length + breachedPasswords.length;
            const maxScore = 100;
            const penaltyPerIssue = passwords.length > 0 ? maxScore / passwords.length : 0;

            const overallScore = Math.max(0, Math.round(
                maxScore - (totalIssues * penaltyPerIssue * 0.5)
            ));

            setHealth({
                overallScore,
                weakPasswords,
                reusedPasswords,
                oldPasswords,
                breachedPasswords,
                totalPasswords: passwords.length,
                strongPasswords: strongCount
            });
        } catch (err: any) {
            setError(err.message || 'Failed to analyze password health');
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        analyzePasswordHealth();
    };

    return {
        health,
        loading,
        error,
        refresh
    };
}

// Helper functions

function calculatePasswordStrength(password: string): number {
    let strength = 0;

    // Length
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 10;

    // Character variety
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

    // Patterns (deduct points)
    if (/(.)\1{2,}/.test(password)) strength -= 10; // Repeated characters
    if (/^[0-9]+$/.test(password)) strength -= 20; // Only numbers
    if (/^[a-zA-Z]+$/.test(password)) strength -= 10; // Only letters

    return Math.min(100, Math.max(0, strength));
}

function calculatePasswordAge(updatedAt: string): number {
    const updated = new Date(updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updated.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getWeakPasswordRecommendation(strength: number): string {
    if (strength < 30) {
        return 'Critical: Use at least 12 characters with uppercase, lowercase, numbers, and symbols';
    } else if (strength < 50) {
        return 'Add more character variety and increase length to 12+ characters';
    } else {
        return 'Consider adding special characters and increasing length';
    }
}
