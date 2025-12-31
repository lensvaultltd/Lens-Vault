import { supabase } from '../lib/supabase';

/**
 * Plan Change Service
 * Handles upgrades, downgrades, and grace periods
 */

export interface PlanChangeResult {
    success: boolean;
    message: string;
    gracePeriodEnd?: Date;
    dataArchived?: boolean;
}

// Grace period durations (in days)
const GRACE_PERIODS = {
    'family-to-premium': 30,
    'family-to-free': 30,
    'premium-to-free': 14,
    'business-to-family': 30,
    'business-to-premium': 30,
    'business-to-free': 30,
};

/**
 * Handle plan change (upgrade or downgrade)
 */
export async function handlePlanChange(
    userId: string,
    fromPlan: string,
    toPlan: string
): Promise<PlanChangeResult> {
    const changeType = determineChangeType(fromPlan, toPlan);

    if (changeType === 'upgrade') {
        return handleUpgrade(userId, fromPlan, toPlan);
    } else if (changeType === 'downgrade') {
        return handleDowngrade(userId, fromPlan, toPlan);
    } else {
        return handleSwitch(userId, fromPlan, toPlan);
    }
}

/**
 * Determine if change is upgrade, downgrade, or switch
 */
function determineChangeType(fromPlan: string, toPlan: string): 'upgrade' | 'downgrade' | 'switch' {
    const planHierarchy = { free: 0, premium: 1, family: 2, business: 3 };
    const fromLevel = planHierarchy[fromPlan as keyof typeof planHierarchy] || 0;
    const toLevel = planHierarchy[toPlan as keyof typeof planHierarchy] || 0;

    if (toLevel > fromLevel) return 'upgrade';
    if (toLevel < fromLevel) return 'downgrade';
    return 'switch';
}

/**
 * Handle upgrade (immediate access)
 */
async function handleUpgrade(
    userId: string,
    fromPlan: string,
    toPlan: string
): Promise<PlanChangeResult> {
    try {
        // 1. Update user plan
        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_plan: toPlan,
                previous_plan: fromPlan,
                downgrade_date: null,
                grace_period_end: null
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 2. Log plan change
        await logPlanChange(userId, fromPlan, toPlan, 'upgrade');

        // 3. Restore archived data if exists
        await restoreArchivedData(userId);

        return {
            success: true,
            message: `Successfully upgraded to ${toPlan} plan!`,
        };
    } catch (error) {
        console.error('Upgrade error:', error);
        return {
            success: false,
            message: 'Failed to upgrade plan. Please try again.',
        };
    }
}

/**
 * Handle downgrade (with grace period)
 */
async function handleDowngrade(
    userId: string,
    fromPlan: string,
    toPlan: string
): Promise<PlanChangeResult> {
    try {
        // 1. Calculate grace period
        const gracePeriodKey = `${fromPlan}-to-${toPlan}` as keyof typeof GRACE_PERIODS;
        const gracePeriodDays = GRACE_PERIODS[gracePeriodKey] || 14;
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

        // 2. Update user plan with grace period
        const { error: updateError } = await supabase
            .from('users')
            .update({
                subscription_plan: toPlan,
                previous_plan: fromPlan,
                downgrade_date: new Date().toISOString(),
                grace_period_end: gracePeriodEnd.toISOString()
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 3. Log plan change
        await logPlanChange(userId, fromPlan, toPlan, 'downgrade', gracePeriodEnd);

        // 4. Schedule data archival (will happen after grace period)
        // This will be handled by a cron job or background task

        return {
            success: true,
            message: `Plan downgraded. You have ${gracePeriodDays} days to upgrade and keep your data.`,
            gracePeriodEnd,
        };
    } catch (error) {
        console.error('Downgrade error:', error);
        return {
            success: false,
            message: 'Failed to downgrade plan. Please try again.',
        };
    }
}

/**
 * Handle plan switch (same tier, e.g., monthly to yearly)
 */
async function handleSwitch(
    userId: string,
    fromPlan: string,
    toPlan: string
): Promise<PlanChangeResult> {
    try {
        const { error: updateError } = await supabase
            .from('users')
            .update({ subscription_plan: toPlan })
            .eq('id', userId);

        if (updateError) throw updateError;

        await logPlanChange(userId, fromPlan, toPlan, 'switch');

        return {
            success: true,
            message: `Successfully switched to ${toPlan} plan!`,
        };
    } catch (error) {
        console.error('Switch error:', error);
        return {
            success: false,
            message: 'Failed to switch plan. Please try again.',
        };
    }
}

/**
 * Archive user data when grace period ends
 */
export async function archiveData(userId: string, dataType: 'family_members' | 'shares' | 'settings'): Promise<boolean> {
    try {
        let data: any = {};

        // Fetch data based on type
        if (dataType === 'family_members') {
            // TODO: Fetch family members data
            data = { members: [] };
        } else if (dataType === 'shares') {
            const { data: shares } = await supabase
                .from('shared_access')
                .select('*')
                .eq('owner_id', userId);
            data = { shares };
        }

        // Calculate expiry (90 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        // Archive the data
        const { error } = await supabase
            .from('archived_data')
            .insert({
                user_id: userId,
                data_type: dataType,
                data,
                expires_at: expiresAt.toISOString(),
            });

        if (error) throw error;

        return true;
    } catch (error) {
        console.error('Archive error:', error);
        return false;
    }
}

/**
 * Restore archived data when user upgrades
 */
export async function restoreArchivedData(userId: string): Promise<boolean> {
    try {
        // Get all non-expired archived data
        const { data: archivedData, error: fetchError } = await supabase
            .from('archived_data')
            .select('*')
            .eq('user_id', userId)
            .eq('restored', false)
            .gt('expires_at', new Date().toISOString());

        if (fetchError) throw fetchError;
        if (!archivedData || archivedData.length === 0) return true;

        // Restore each data type
        for (const archive of archivedData) {
            if (archive.data_type === 'shares' && archive.data.shares) {
                // Restore shares
                const { error: restoreError } = await supabase
                    .from('shared_access')
                    .insert(archive.data.shares);

                if (restoreError) console.error('Failed to restore shares:', restoreError);
            }

            // Mark as restored
            await supabase
                .from('archived_data')
                .update({ restored: true })
                .eq('id', archive.id);
        }

        return true;
    } catch (error) {
        console.error('Restore error:', error);
        return false;
    }
}

/**
 * Log plan change to audit trail
 */
async function logPlanChange(
    userId: string,
    fromPlan: string,
    toPlan: string,
    changeType: 'upgrade' | 'downgrade' | 'switch',
    gracePeriodEnd?: Date
): Promise<void> {
    try {
        await supabase.from('plan_changes').insert({
            user_id: userId,
            from_plan: fromPlan,
            to_plan: toPlan,
            change_type: changeType,
            grace_period_end: gracePeriodEnd?.toISOString(),
        });
    } catch (error) {
        console.error('Failed to log plan change:', error);
    }
}

/**
 * Check if user is in grace period
 */
export async function isInGracePeriod(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('grace_period_end')
            .eq('id', userId)
            .single();

        if (error || !data) return false;

        if (data.grace_period_end) {
            const gracePeriodEnd = new Date(data.grace_period_end);
            return gracePeriodEnd > new Date();
        }

        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Get days remaining in grace period
 */
export async function getGracePeriodDaysRemaining(userId: string): Promise<number> {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('grace_period_end')
            .eq('id', userId)
            .single();

        if (error || !data || !data.grace_period_end) return 0;

        const gracePeriodEnd = new Date(data.grace_period_end);
        const now = new Date();
        const diffTime = gracePeriodEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    } catch (error) {
        return 0;
    }
}
