// Supabase Auth Integration
import express from 'express';
import { supabase } from '../supabase.ts';

const router = express.Router();

// Middleware helper to verify Token
const verifyToken = async (req: express.Request): Promise<any> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.split('Bearer ')[1];
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return null;
        return user;
    } catch (e) {
        console.error('Token verification failed', e);
        return null;
    }
};

router.post('/signup', async (req, res) => {
    // Client sends Supabase Session Token + Encrypted Keys
    const { token, email, masterPasswordHash, publicKey, encryptedPrivateKey } = req.body;
    console.log(`[Auth] Signup request received for ${email}`);

    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.error(`[Auth] Signup verification failed: ${error?.message}`);
            return res.status(403).json({ error: 'Invalid token' });
        }

        if ((user.email || '').toLowerCase() !== email.toLowerCase()) {
            console.error(`[Auth] Email mismatch: ${user.email} vs ${email}`);
            return res.status(403).json({ error: 'Email mismatch' });
        }

        const userId = user.id;

        // Check for existing user profile
        const { data: existing } = await supabase.from('users').select('id').eq('id', userId).maybeSingle();
        if (existing) {
            return res.status(200).json({ success: true, message: 'User profile already exists (synced).' });
        }

        // Insert into 'users' table using the Auth ID
        const { error: insertError } = await supabase.from('users').insert({
            id: userId,
            email,
            master_password_hash: masterPasswordHash,
            public_key: publicKey,
            encrypted_private_key: encryptedPrivateKey
        });

        if (insertError) {
            console.error('Supabase Insert Error:', insertError);
            throw insertError;
        }

        // Create empty vault
        const { error: vaultError } = await supabase.from('vaults').insert({ user_id: userId, encrypted_data: '' });

        if (vaultError) {
            console.error('Supabase Vault Create Error:', vaultError);
            throw vaultError;
        }

        res.json({ success: true, message: 'Account synced with backend.' });
    } catch (error: any) {
        console.error('Signup sync error:', error);
        res.status(500).json({ success: false, message: `Sync failed: ${error.message || JSON.stringify(error)}` });
    }
});

// Helper to determine if user is admin
const isUserAdmin = (email: string) => {
    // [SCALABILITY] TODO: Migrate to database-driven RBAC (role-based access control)
    const admins = ['LensVault@proton.me'];
    return admins.includes(email);
};

router.post('/login', async (req, res) => {
    // Client has already authenticated with Supabase Auth
    const { token } = req.body;
    if (!token) return res.status(401).json({ error: 'Missing token' });

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(403).json({ success: false, message: 'Invalid token.' });
        }

        const email = user.email || '';

        // Fetch user keys from Supabase
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('email, subscription_plan, public_key, encrypted_private_key')
            .eq('id', user.id) // Use strict ID match
            .maybeSingle();

        if (dbError || !userData) {
            return res.status(404).json({ success: false, message: 'User data not found.' });
        }

        res.json({
            success: true,
            user: {
                email: userData.email,
                subscription: userData.subscription_plan,
                isAdmin: isUserAdmin(userData.email)
            },
            keys: {
                publicKey: userData.public_key,
                encryptedPrivateKey: userData.encrypted_private_key
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error during login sync.' });
    }
});

router.post('/logout', (req, res) => {
    // Stateless with Supabase/JWT
    res.json({ success: true, message: 'Logged out.' });
});

router.get('/me', async (req, res) => {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    const { data: userData } = await supabase.from('users').select('email, subscription_plan').eq('id', user.id).maybeSingle();

    if (!userData) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
        success: true,
        user: {
            email: userData.email,
            subscription: userData.subscription_plan,
            isAdmin: isUserAdmin(userData.email)
        }
    });
});

router.get('/keys/:email', async (req, res) => {
    const { email } = req.params;
    const { data: user } = await supabase.from('users').select('public_key').ilike('email', email).maybeSingle();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, publicKey: user.public_key });
});

router.delete('/me', async (req, res) => {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid token' });

    console.log(`[Auth] Deleting account for ${user.email}`);

    try {
        // 1. Delete from Supabase 'users' table
        // This should cascade delete the vault if foreign keys are set up correctly, 
        // but explicit delete is safer if cascades aren't 100%.
        const { error: dbError } = await supabase
            .from('users')
            .delete()
            .eq('id', user.id);

        if (dbError) {
            console.error('Supabase Delete Error:', dbError);
            return res.status(500).json({ success: false, message: 'Failed to delete database record.' });
        }

        // 2. Delete from Supabase Auth (requires Service Role)
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

        if (authError) {
            console.error('Supabase Auth Delete Error:', authError);
            // Verify if user is actually gone or if there was a permission issue
        }

        res.json({ success: true, message: 'Account permanently deleted.' });

    } catch (error: any) {
        console.error('Delete Account Error:', error);
        res.status(500).json({ success: false, message: 'Server error during deletion.' });
    }
});

export default router;
