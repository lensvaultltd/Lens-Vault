import express from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, type AuthRequest } from '../middleware/auth.ts';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
    // Lookup user by email to ensure we get the correct internal ID
    const email = req.user?.email;

    try {
        // 1. Get Internal User ID
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .ilike('email', email)
            .maybeSingle();

        if (userError || !user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 2. Get Vault
        const { data: vault, error } = await supabase
            .from('vaults')
            .select('encrypted_data')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            throw error;
        }

        if (!vault) {
            return res.json({ success: true, data: null, message: 'No vault found.' });
        }

        res.json({ success: true, data: vault.encrypted_data, message: 'Vault fetched successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error fetching vault.' });
    }
});

router.put('/', async (req: AuthRequest, res) => {
    const email = req.user?.email;
    const { encryptedData } = req.body;

    try {
        // 1. Get Internal User ID
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .ilike('email', email)
            .maybeSingle();

        if (userError || !user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // 2. Upsert Vault
        const { error } = await supabase
            .from('vaults')
            .upsert({ user_id: user.id, encrypted_data: encryptedData, updated_at: new Date().toISOString() });

        if (error) throw error;

        res.json({ success: true, message: 'Vault saved successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error saving vault.' });
    }
});

export default router;
