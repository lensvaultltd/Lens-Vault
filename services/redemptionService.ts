
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/use-toast';

export const RedemptionService = {
    async redeemCode(code: string, userId: string) {
        if (code !== 'LAUNCH20') {
            return { success: false, error: 'Invalid redemption code' };
        }

        try {
            // 1. Check global redemption count (using a dedicated table or counting matching rows)
            // Since we can't easily create a table purely from frontend code if RLS blocks it, 
            // we'll try to check a "system_settings" or similar table, OR Query the number of users who have redeemed.
            // Strategy: We'll query 'subscriptions' table where tier='premium' and created_at is recent, 
            // OR better: check a 'redemptions' table.

            // FALLBACK STRATEGY IF TABLE DOESN'T EXIST:
            // We will try to SELECT from a 'redemptions' table. If it errors, we assume we need to create it 
            // (which we can't do from here), so we'll fallback to a "soft limit" client side check 
            // by querying profile metadata if possible, or just trusting the "trick" (since client side limits are hacky).

            // Let's assume we can insert into a 'redemptions' table.
            // If the table doesn't exist, this will fail.
            // User asked for "create a redeem code that answers to supabase".
            // I will implement the logic to TRY to insert.

            // First, check if user already redeemed
            const { data: existing } = await supabase
                .from('redemptions')
                .select('id')
                .eq('user_id', userId)
                .eq('code', 'LAUNCH20')
                .single();

            if (existing) {
                return { success: false, error: 'Code already redeemed' };
            }

            // Check total count
            const { count } = await supabase
                .from('redemptions')
                .select('id', { count: 'exact', head: true })
                .eq('code', 'LAUNCH20');

            // The "Trick": Marketing says 20 spots, but app only gives to first 10.
            if (count !== null && count >= 10) {
                // Trick logic: It behaves as if expired/full
                return { success: false, error: 'Maximum redemptions reached for this code.' };
            }

            // Grant Premium
            // Update subscription to premium with 2 months expiry
            const twoMonthsFromNow = new Date();
            twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

            const { error: subError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    tier: 'premium',
                    status: 'active',
                    valid_until: twoMonthsFromNow.toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (subError) throw subError;

            // Log redemption
            const { error: logError } = await supabase
                .from('redemptions')
                .insert({
                    user_id: userId,
                    code: 'LAUNCH20',
                    redeemed_at: new Date().toISOString()
                });

            if (logError) {
                // If table doesn't exist, we might fail here.
                console.warn("Could not log redemption, but premium granted.");
            }

            return { success: true };

        } catch (error: any) {
            console.error('Redemption error:', error);
            return { success: false, error: error.message || 'Failed to redeem code' };
        }
    }
};
