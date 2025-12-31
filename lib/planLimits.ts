/**
 * Plan limits and feature restrictions
 * Centralized configuration for subscription enforcement
 */

export const PLAN_LIMITS = {
    free: {
        maxPasswords: 50,
        maxFolders: 5,
        aiAuditor: false,
        familySharing: false,
        emergencyAccess: false,
        darkWebMonitoring: false,
        passwordSharing: false,
        exportData: true,
        importData: true,
        twoFactorAuth: false,
    },
    premium: {
        maxPasswords: 1000,
        maxFolders: 50,
        aiAuditor: true,
        familySharing: false,
        emergencyAccess: true,
        darkWebMonitoring: true,
        passwordSharing: true,
        exportData: true,
        importData: true,
        twoFactorAuth: true,
    },
    family: {
        maxPasswords: 5000,
        maxFolders: 100,
        maxFamilyMembers: 6,
        aiAuditor: true,
        familySharing: true,
        emergencyAccess: true,
        darkWebMonitoring: true,
        passwordSharing: true,
        exportData: true,
        importData: true,
        twoFactorAuth: true,
    },
    business: {
        maxPasswords: 10000,
        maxFolders: 200,
        maxTeamMembers: 50,
        aiAuditor: true,
        familySharing: true,
        emergencyAccess: true,
        darkWebMonitoring: true,
        passwordSharing: true,
        exportData: true,
        importData: true,
        twoFactorAuth: true,
        adminDashboard: true,
        auditLogs: true,
    },
} as const;

export type SubscriptionPlan = keyof typeof PLAN_LIMITS;

/**
 * Check if user has access to a feature
 */
export function hasFeatureAccess(
    plan: SubscriptionPlan,
    feature: keyof typeof PLAN_LIMITS.free
): boolean {
    return PLAN_LIMITS[plan][feature] === true;
}

/**
 * Get limit for a plan
 */
export function getPlanLimit(
    plan: SubscriptionPlan,
    limit: 'maxPasswords' | 'maxFolders' | 'maxFamilyMembers' | 'maxTeamMembers'
): number {
    return (PLAN_LIMITS[plan][limit] as number) || 0;
}

/**
 * Check if user can add more passwords
 */
export function canAddPassword(plan: SubscriptionPlan, currentCount: number): boolean {
    const limit = getPlanLimit(plan, 'maxPasswords');
    return currentCount < limit;
}

/**
 * Get upgrade message for feature
 */
export function getUpgradeMessage(feature: string): string {
    const messages: Record<string, string> = {
        aiAuditor: 'Upgrade to Premium to access AI Security Auditor',
        familySharing: 'Upgrade to Family plan to share with family members',
        emergencyAccess: 'Upgrade to Premium for Emergency Access',
        darkWebMonitoring: 'Upgrade to Premium for Dark Web Monitoring',
        passwordSharing: 'Upgrade to Premium to share passwords',
        twoFactorAuth: 'Upgrade to Premium for Two-Factor Authentication',
        maxPasswords: 'You\'ve reached your password limit. Upgrade for more storage.',
    };

    return messages[feature] || 'Upgrade to access this feature';
}
